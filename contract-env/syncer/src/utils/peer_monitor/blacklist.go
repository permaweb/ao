package peer_monitor

import (
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/exp/slices"
)

type Blacklist struct {
	peers sync.Map
	Size  atomic.Int64
}

type item struct {
	Peer     string
	Inserted time.Time
}

func (self *Blacklist) Add(peer string) {
	self.peers.Store(peer, time.Now())
	self.Size.Add(1)
}

func (self *Blacklist) Contains(peer string) bool {
	_, contains := self.peers.Load(peer)
	return contains
}

func (self *Blacklist) RemoveOldest(n int) {
	items := make([]item, 0)
	self.peers.Range(func(key any, value any) bool {
		peer, _ := key.(string)
		inserted, _ := value.(time.Time)
		items = append(items, item{
			Peer:     peer,
			Inserted: inserted,
		})
		return true
	})

	// Oldest are in the beggining of the slice
	slices.SortFunc(items, func(a, b item) bool {
		return a.Inserted.Before(b.Inserted)
	})

	for i := 0; i < n; i++ {
		self.peers.Delete(items[i])
	}

	self.Size.Add(int64(-1 * n))
}
