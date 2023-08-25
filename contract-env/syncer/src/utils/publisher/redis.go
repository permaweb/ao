package publisher

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding"
	"errors"
	"fmt"
	"net"
	"time"

	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/monitoring"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/redis/go-redis/v9"
)

// Forwards messages to Redis
type RedisPublisher[In encoding.BinaryMarshaler] struct {
	*task.Task

	redisConfig config.Redis
	monitor     monitoring.Monitor
	client      *redis.Client
	channelName string
	input       chan In

	// Monitor index
	monitorIdx int

	// If true, messages will be discarded when there's no redis connection
	isDiscardWhenDisconnected bool

	// One of the connection in pool is valid
	isConnected bool
}

func NewRedisPublisher[In encoding.BinaryMarshaler](config *config.Config, redisConfig config.Redis, name string) (self *RedisPublisher[In]) {
	self = new(RedisPublisher[In])

	self.redisConfig = redisConfig

	self.Task = task.NewTask(config, name).
		WithSubtaskFunc(self.run).
		WithOnBeforeStart(self.connect).
		WithOnAfterStop(self.disconnect).
		WithPeriodicSubtaskFunc(time.Second*30, self.ping).
		WithPeriodicSubtaskFunc(time.Second*60, self.saveStats).
		WithWorkerPool(redisConfig.MaxWorkers, redisConfig.MaxQueueSize)

	return
}

func (self *RedisPublisher[In]) WithInputChannel(v chan In) *RedisPublisher[In] {
	self.input = v
	return self
}

func (self *RedisPublisher[In]) WithChannelName(v string) *RedisPublisher[In] {
	self.channelName = v
	return self
}

func (self *RedisPublisher[In]) WithMonitor(monitor monitoring.Monitor, idx int) *RedisPublisher[In] {
	self.monitor = monitor
	self.monitorIdx = idx
	return self
}

func (self *RedisPublisher[In]) WithDiscardWhenDisconnected(v bool) *RedisPublisher[In] {
	self.isDiscardWhenDisconnected = v
	return self
}

func (self *RedisPublisher[In]) disconnect() {
	err := self.client.Close()
	if err != nil {
		self.Log.WithError(err).Error("Failed to close connection")
	}
}

func (self *RedisPublisher[In]) connect() (err error) {
	self.Log.WithField("port", self.redisConfig.Port).WithField("host", self.redisConfig.Host).Info("Setup Redis connection")
	opts := redis.Options{
		ClientName:      fmt.Sprintf("warp.cc/%s", self.Name),
		Addr:            fmt.Sprintf("%s:%d", self.redisConfig.Host, self.redisConfig.Port),
		Password:        self.redisConfig.Password,
		Username:        self.redisConfig.User,
		DB:              self.redisConfig.DB,
		MinIdleConns:    self.redisConfig.MinIdleConns,
		MaxIdleConns:    self.redisConfig.MaxIdleConns,
		ConnMaxIdleTime: self.redisConfig.ConnMaxIdleTime,
		PoolSize:        self.redisConfig.MaxOpenConns,
		PoolFIFO:        true,
		PoolTimeout:     time.Minute,
		OnConnect: func(ctx context.Context, con *redis.Conn) error {
			self.Log.WithField("state", con.String()).WithField("host", self.redisConfig.Host).Info("Connected to Redis")
			self.isConnected = true
			return nil
		},
		ReadTimeout:           time.Second * 30,
		WriteTimeout:          time.Second * 30,
		DialTimeout:           time.Minute,
		ConnMaxLifetime:       self.redisConfig.ConnMaxLifetime,
		ContextTimeoutEnabled: true,
	}

	if self.redisConfig.ClientCert != "" && self.redisConfig.ClientKey != "" && self.redisConfig.CaCert != "" {
		cert, err := tls.X509KeyPair([]byte(self.redisConfig.ClientCert), []byte(self.redisConfig.ClientKey))
		if err != nil {
			self.Log.WithError(err).Error("Failed to load client cert")
		}

		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM([]byte(self.redisConfig.CaCert)) {
			return errors.New("failed to append CA cert to pool")
		}

		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: false,
			RootCAs:            caCertPool,
			ClientCAs:          caCertPool,
			Certificates:       []tls.Certificate{cert},
		}
	} else if self.redisConfig.EnableTLS {
		opts.TLSConfig = &tls.Config{
			InsecureSkipVerify: false,
		}
	}

	opts.Dialer = func(ctx context.Context, network, addr string) (net.Conn, error) {
		netDialer := &net.Dialer{
			Timeout:   time.Minute,
			KeepAlive: time.Second * 30,
		}
		if opts.TLSConfig == nil {
			return net.Dial(network, addr)
			// return nil, errors.New("TLS config is nil")
		}
		return tls.DialWithDialer(netDialer, network, addr, opts.TLSConfig)
	}

	self.client = redis.NewClient(&opts)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	err = self.client.Ping(ctx).Err()
	if err != nil {
		self.Log.WithError(err).Error("Failed to ping Redis")
		return
	}
	self.Log.WithField("host", self.redisConfig.Host).Info("Redis connection OK")

	return
}

func (self *RedisPublisher[In]) saveStats() (err error) {
	stats := self.client.PoolStats()
	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.PoolHits.Store(stats.Hits)
	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.PoolIdleConns.Store(stats.IdleConns)
	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.PoolMisses.Store(stats.Misses)
	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.PoolStaleConns.Store(stats.StaleConns)
	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.PoolTimeouts.Store(stats.Timeouts)
	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.PoolTotalConns.Store(stats.TotalConns)
	return nil
}

func (self *RedisPublisher[In]) ping() (err error) {
	// No need to monitor connection with another message if messages go through
	if time.Now().Unix()-self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.LastSuccessfulMessageTimestamp.Load() < 30 {
		return nil
	}

	// Test the connection with a PING message
	self.Log.
		WithField("hits", self.client.PoolStats().Hits).
		WithField("idle_conns", self.client.PoolStats().IdleConns).
		WithField("misses", self.client.PoolStats().Misses).
		WithField("stale_conns", self.client.PoolStats().StaleConns).
		WithField("timeouts", self.client.PoolStats().Timeouts).
		WithField("total_conns", self.client.PoolStats().TotalConns).
		Debug("Monitor Redis connection")
	err = self.client.Ping(self.Ctx).Err()
	if err != nil {
		self.Log.WithError(err).Error("Failed to ping Redis")
		self.setConnected(false)

		return nil
	}

	self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.LastSuccessfulMessageTimestamp.Store(time.Now().Unix())

	self.setConnected(true)

	return nil
}

func (self *RedisPublisher[In]) run() (err error) {
	i := 0
	for payload := range self.input {
		if self.isDiscardWhenDisconnected && !self.isConnected {
			// Discard incomming payloads
			continue
		}

		i++

		self.Log.WithField("i", i).Trace("Redis publish...")

		err = task.NewRetry().
			WithContext(self.Ctx).
			WithMaxElapsedTime(self.redisConfig.MaxElapsedTime).
			WithMaxInterval(self.redisConfig.MaxInterval).
			WithOnError(func(err error, isDurationAcceptable bool) error {
				self.Log.WithError(err).Warn("Failed to publish message, retrying")
				self.monitor.GetReport().RedisPublishers[self.monitorIdx].Errors.Publish.Inc()
				return err
			}).
			Run(func() (err error) {
				// self.Log.WithField("i", i).Debug("-> Publish message to Redis")
				// defer self.Log.WithField("i", i).Debug("<- Publish message to Redis")
				return self.client.Publish(self.Ctx, self.channelName, payload).Err()
			})
		if err != nil {
			self.Log.WithField("i", i).WithError(err).Error("Persistant error to publish message, giving up")
			self.monitor.GetReport().RedisPublishers[self.monitorIdx].Errors.PersistentFailure.Inc()

			// Mark the connection as disconnected if it's a network error
			if errors.Is(err, &net.OpError{}) ||
				errors.Is(err, net.ErrClosed) ||
				errors.Is(err, &net.DNSError{}) ||
				errors.Is(err, &net.AddrError{}) ||
				errors.Is(err, &net.ParseError{}) {
				self.Log.WithField("i", i).WithError(err).Error("Mark redis connection as disconnected")
				self.setConnected(false)
			}
			return
		}

		self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.MessagesPublished.Inc()
		self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.LastSuccessfulMessageTimestamp.Store(time.Now().Unix())

		self.Log.WithField("i", i).Trace("Published message to Redis")
	}
	return nil
}

func (self *RedisPublisher[In]) setConnected(v bool) {
	self.isConnected = v
	if v {
		self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.IsConnected.Store(1)
	} else {
		self.monitor.GetReport().RedisPublishers[self.monitorIdx].State.IsConnected.Store(0)
	}
}
