package peer_monitor

import (
	"context"
	"encoding/json"
	"net/netip"
	"sort"
	"sync"

	"github.com/warp-contracts/syncer/src/utils/arweave"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/slice"
	"github.com/warp-contracts/syncer/src/utils/task"

	"time"
)

type PeerMonitor struct {
	*task.Task

	client *arweave.Client

	// State
	blacklist Blacklist

	monitor monitoring.Monitor
}

type metric struct {
	Peer     string
	Height   int64
	Blocks   int64
	Duration time.Duration
}

func (self *metric) String() string {
	b, _ := json.Marshal(self)
	return string(b)
}

func NewPeerMonitor(config *config.Config) (self *PeerMonitor) {
	self = new(PeerMonitor)

	self.Task = task.NewTask(config, "peer-monitor").
		WithPeriodicSubtaskFunc(config.PeerMonitor.Period, self.runPeriodically).
		WithWorkerPool(config.PeerMonitor.NumWorkers, config.PeerMonitor.WorkerQueueSize)

	return
}

func (self *PeerMonitor) WithClient(client *arweave.Client) *PeerMonitor {
	self.client = client
	return self
}

func (self *PeerMonitor) WithMonitor(monitor monitoring.Monitor) *PeerMonitor {
	self.monitor = monitor
	return self
}

// Periodically checks Arweave network info for updated height
func (self *PeerMonitor) runPeriodically() (err error) {
	height, err := self.getTrustedHeight()
	if err != nil {
		self.Log.WithError(err).Error("Failed to get trusted height")
		return nil
	}

	peers, err := self.getPeers()
	if err != nil {
		self.Log.WithError(err).Error("Failed to get peers")
		return nil
	}

	peers = self.sortPeersByMetrics(height, peers)

	numPeers := len(peers)
	if numPeers > self.Config.PeerMonitor.MaxPeers {
		numPeers = self.Config.PeerMonitor.MaxPeers
	}

	self.client.SetPeers(peers[:numPeers])

	self.monitor.GetReport().Peer.State.NumPeers.Store(uint64(numPeers))
	self.monitor.GetReport().Peer.State.PeersBlacklisted.Store(uint64(self.blacklist.Size.Load()))

	self.Log.WithField("numBlacklisted", self.blacklist.Size.Load()).Trace("Set new peers")
	self.blacklist.RemoveOldest(self.Config.PeerMonitor.MaxPeersRemovedFromBlacklist)

	return nil
}

func (self *PeerMonitor) getTrustedHeight() (out int64, err error) {
	// Use a specific URL as the source of truth, to avoid race conditions with SDK
	ctx := context.WithValue(self.Ctx, arweave.ContextForcePeer, self.Config.NetworkMonitor.Url)
	ctx = context.WithValue(ctx, arweave.ContextDisablePeers, true)

	networkInfo, err := self.client.GetNetworkInfo(ctx)
	if err != nil {
		return
	}

	out = networkInfo.Height
	return
}

func (self *PeerMonitor) getPeers() (peers []string, err error) {
	// Get peers available in the network
	allPeers, err := self.client.GetPeerList(self.Ctx)
	if err != nil {
		self.Log.Error("Failed to get Arweave peer list")
		self.monitor.GetReport().Peer.Errors.PeerDownloadErrors.Inc()
		return
	}
	self.Log.WithField("numPeers", len(allPeers)).Debug("Got peers")

	// Slice of checked addresses in proper format
	peers = make([]string, 0, len(allPeers))

	var addr netip.AddrPort
	for _, peer := range allPeers {
		// Validate peer address
		addr, err = netip.ParseAddrPort(peer)
		if err != nil || !addr.IsValid() {
			self.Log.WithField("peer", peer).Error("Bad peer address")
			continue
		}

		// Peers are in format <ip>:<port>, add http schema
		peers = append(peers, "http://"+peer)
	}

	return
}

func (self *PeerMonitor) sortPeersByMetrics(height int64, allPeers []string) (peers []string) {
	self.Log.Debug("Checking peers")

	// Sync between workers
	var mtx sync.Mutex
	var wg sync.WaitGroup
	wg.Add(len(allPeers))

	// Metrics used to sort peers
	metrics := make([]*metric, 0, len(allPeers))

	// Perform test requests
	for i, peer := range allPeers {
		// Copy variables
		peer := peer
		i := i

		self.SubmitToWorker(func() {
			var (
				info     *arweave.NetworkInfo
				duration time.Duration
				err      error
			)

			// Neglect blacklisted peers
			if self.blacklist.Contains(peer) {
				goto end
			}

			self.Log.WithField("peer", peer).WithField("idx", i).WithField("maxIdx", len(allPeers)-1).Trace("Checking peer")
			info, duration, err = self.client.CheckPeerConnection(self.Ctx, peer)
			if err != nil {
				self.Log.WithField("peer", peer).Trace("Black list peer")

				// Put the peer on the blacklist
				self.blacklist.Add(peer)

				// Neglect peers that returned and error
				goto end
			}

			mtx.Lock()
			metrics = append(metrics, &metric{
				Duration: duration,
				Height:   info.Height,
				Blocks:   info.Blocks,
				Peer:     peer,
			})

			mtx.Unlock()

			// self.Log.WithField("metric", metrics[len(metrics)-1]).Info("Metric")

		end:
			wg.Done()
		})
	}

	// Wait for workers to finish
	wg.Wait()

	// Filter out peers that are too far out
	metrics = slice.Filter(metrics, func(m *metric) bool {
		// TODO: Move this constant to dedicated config
		return height-m.Height < 50
	})

	// Sort using response times (less is better)
	sort.Slice(metrics, func(i int, j int) bool {
		return metrics[i].Duration < metrics[j].Duration
	})

	// Sort using number of not synchronized blocks (less is better)
	sort.SliceStable(metrics, func(i int, j int) bool {
		a := metrics[i]
		b := metrics[j]
		return (a.Height-a.Blocks < b.Height-b.Blocks)
	})

	// Get the sorted peers
	peers = make([]string, len(metrics))
	for i, metric := range metrics {
		peers[i] = metric.Peer
	}

	return
}
