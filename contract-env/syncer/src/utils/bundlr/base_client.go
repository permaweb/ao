package bundlr

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/warp-contracts/syncer/src/utils/build_info"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/go-resty/resty/v2"
	"github.com/sirupsen/logrus"
	"github.com/teivah/onecontext"
	"golang.org/x/time/rate"
)

type BaseClient struct {
	client *resty.Client
	config *config.Bundlr
	log    *logrus.Entry

	parentCtx context.Context

	// State
	mtx      sync.RWMutex
	peers    []string
	limiters map[string]*rate.Limiter
	// lastLimitDecrease time.Time

	ctx       context.Context
	cancel    context.CancelFunc
	lastReset time.Time
}

func newBaseClient(ctx context.Context, config *config.Bundlr) (self *BaseClient) {
	self = new(BaseClient)
	self.config = config
	self.log = logger.NewSublogger("bundlr-client")
	self.parentCtx = ctx

	self.limiters = make(map[string]*rate.Limiter)

	// Sets up HTTP client
	self.Reset()

	return
}

func (self *BaseClient) Reset() {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	// Ensure client isn't reset too often
	if time.Since(self.lastReset) < time.Second {
		return
	}
	self.lastReset = time.Now()

	if self.client != nil {
		self.log.Warn("Resetting HTTP client")
	}

	if self.cancel != nil {
		self.cancel()
	}

	self.ctx, self.cancel = context.WithCancel(self.parentCtx)

	self.client =
		resty.New().
			// SetDebug(true).
			SetBaseURL(self.config.Urls[0]).
			SetTimeout(self.config.RequestTimeout).
			SetHeader("User-Agent", "warp.cc/bundle/"+build_info.Version).
			SetRetryCount(1).
			SetTransport(self.createTransport()).
			AddRetryCondition(self.onRetryCondition).
			OnBeforeRequest(self.onRateLimit).
			// NOTE: Trace logs, used only when debugging. Needs to be before other OnAfterResponse callbacks
			// EnableTrace().
			// OnAfterResponse(func(c *resty.Client, resp *resty.Response) error {
			// 	t, _ := json.Marshal(resp.Request.TraceInfo())
			// 	self.log.WithField("trace", string(t)).WithField("url", resp.Request.URL).Info("Trace")
			// 	return nil
			// }).
			// OnAfterResponse(self.onRetryRequest).
			OnAfterResponse(self.onStatusToError)

}

func (self *BaseClient) createTransport() *http.Transport {
	dialer := &net.Dialer{
		Timeout:   self.config.DialerTimeout,
		KeepAlive: self.config.DialerKeepAlive,
		DualStack: true,
	}

	return &http.Transport{
		// Some config options disable http2, try it anyway
		ForceAttemptHTTP2: true,

		DialContext:           dialer.DialContext,
		TLSHandshakeTimeout:   self.config.TLSHandshakeTimeout,
		ExpectContinueTimeout: 1 * time.Second,

		// This is important. arweave.net may sometimes stop responding on idle connections,
		// resulting in error: context deadline exceeded (Client.Timeout exceeded while awaiting headers)
		IdleConnTimeout:     self.config.IdleConnTimeout,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 1,
		MaxConnsPerHost:     1,
	}
}

// Converts HTTP status to errors
func (self *BaseClient) onStatusToError(c *resty.Client, resp *resty.Response) error {
	// Non-success status code turns into an error
	if resp.IsSuccess() {
		return nil
	}
	if resp.StatusCode() > 399 && resp.StatusCode() < 500 {
		self.log.WithField("status", resp.StatusCode()).
			WithField("resp", string(resp.Body())).
			// WithField("body", resp.Request.Body).
			WithField("url", resp.Request.URL).
			Debug("Bad request")
	}
	return fmt.Errorf("unexpected status: %s", resp.Status())
}

// Retry request only upon server errors
func (self *BaseClient) onRetryCondition(resp *resty.Response, err error) bool {
	return resp != nil && resp.StatusCode() >= 500
}

// Handles rate limiting. There's one limiter per peer/hostname
func (self *BaseClient) onRateLimit(c *resty.Client, req *resty.Request) (err error) {
	// self.log.Trace("Start rate limiter")
	// defer self.log.Trace("Finish rate limiter")
	// Get the limiter, create it if needed
	var (
		limiter *rate.Limiter
		ok      bool
	)

	url, err := url.ParseRequestURI(req.URL)
	if err != nil {
		return
	}

	self.mtx.Lock()
	limiter, ok = self.limiters[url.Host]
	if !ok {
		limiter = rate.NewLimiter(rate.Every(self.config.LimiterInterval), self.config.LimiterBurstSize)
		self.limiters[url.Host] = limiter
	}
	self.mtx.Unlock()

	// Blocks till the request is possible
	// Or ctx gets canceled
	err = limiter.Wait(req.Context())
	if err != nil {
		d, _ := req.Context().Deadline()
		self.log.WithField("peer", url.Host).WithField("deadline", time.Until(d)).WithError(err).Error("Rate limiting failed")
	}
	return
}

// Set the list of potential peers in order they should be used
// Uses only peers that are proper urls
func (self *BaseClient) SetPeers(peers []string) {
	filtered := make([]string, 0, len(peers))

	for _, peer := range peers {
		_, err := url.Parse(peer)
		if err == nil {
			peer = strings.TrimSuffix(peer, "/")
			filtered = append(filtered, peer)
		}
	}

	// Cleanup idle connections
	self.client.GetClient().CloseIdleConnections()

	self.mtx.Lock()
	self.peers = filtered
	self.mtx.Unlock()
}

func (self *BaseClient) Request(ctx context.Context) (*resty.Request, context.CancelFunc) {
	self.mtx.RLock()
	defer self.mtx.RUnlock()

	ctx, cancel := onecontext.Merge(self.ctx, ctx)

	return self.client.R().
		SetContext(ctx).
		ForceContentType("application/json"), cancel
}
