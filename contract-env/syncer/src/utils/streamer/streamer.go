package streamer

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/warp-contracts/syncer/src/utils/build_info"
	"github.com/warp-contracts/syncer/src/utils/config"
	"github.com/warp-contracts/syncer/src/utils/task"

	"github.com/jackc/pgx"
)

// Streams data from postgres notification channel
// puts on output channel
type Streamer struct {
	*task.Task

	pool       *pgx.ConnPool
	connection *pgx.Conn
	cond       *sync.Cond

	isListening  bool
	ctxListen    context.Context
	cancelListen context.CancelFunc
	channelName  string
	Output       chan string
}

func NewStreamer(config *config.Config, name string) (self *Streamer) {
	self = new(Streamer)

	self.cond = sync.NewCond(&sync.Mutex{})

	self.Output = make(chan string)

	self.Task = task.NewTask(config, name).
		WithSubtaskFunc(self.run).
		// WithPeriodicSubtaskFunc(10*time.Second, self.monitor).
		WithOnBeforeStart(self.connect).
		WithOnStop(func() {
			close(self.Output)
		}).
		WithOnAfterStop(self.disconnect)

	return
}

func (self *Streamer) WithNotificationChannelName(name string) *Streamer {
	self.channelName = name
	return self
}

func (self *Streamer) WithCapacity(size int) *Streamer {
	self.Output = make(chan string, size)
	return self
}

func (self *Streamer) Pause() (err error) {
	self.cond.L.Lock()
	defer self.cond.L.Unlock()
	if !self.isListening {
		return
	}

	self.Log.Info("Pause streamer")

	self.isListening = false

	// This will finish waiting for messages in the listening goroutine
	// It will call UNLISTEN
	self.cancelListen()

	return
}

func (self *Streamer) Resume() (err error) {
	self.cond.L.Lock()
	defer self.cond.L.Unlock()

	if self.isListening {
		return
	}

	self.Log.WithField("channel", self.channelName).Info("Resume streamer")

	err = self.connection.Listen(self.channelName)
	if err != nil {
		return
	}
	self.isListening = true

	self.ctxListen, self.cancelListen = context.WithCancel(self.Ctx)

	// Wake the listening goroutine
	self.cond.Broadcast()

	return
}

func (self *Streamer) disconnect() {

	err := self.connection.Close()
	if err != nil {
		self.Log.WithError(err).Error("Failed to close connection")
	}

	self.pool.Close()
}

func (self *Streamer) connect() (err error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s application_name=%s/warp.cc/%s",
		self.Config.Database.Host,
		self.Config.Database.Port,
		self.Config.Database.User,
		self.Config.Database.Password,
		self.Config.Database.Name,
		self.Config.Database.SslMode,
		self.Name,
		build_info.Version)

	config, err := pgx.ParseDSN(dsn)
	if err != nil {
		return
	}

	if self.Config.Database.ClientCert != "" && self.Config.Database.ClientKey != "" && self.Config.Database.CaCert != "" {
		cert, err := tls.X509KeyPair([]byte(self.Config.Database.ClientCert), []byte(self.Config.Database.ClientKey))
		if err != nil {
			self.Log.WithError(err).Error("Failed to load client cert")
		}

		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM([]byte(self.Config.Database.CaCert)) {
			return errors.New("failed to append CA cert to pool")
		}

		config.TLSConfig = &tls.Config{
			InsecureSkipVerify: true,
			RootCAs:            caCertPool,
			ClientCAs:          caCertPool,
			Certificates:       []tls.Certificate{cert},
		}
	}
	self.pool, err = pgx.NewConnPool(pgx.ConnPoolConfig{ConnConfig: config})
	if err != nil {
		return
	}

	self.connection, err = self.pool.Acquire()
	if err != nil {
		return
	}

	return
}

func (self *Streamer) reconnect() {
	var err error
	for {
		self.disconnect()

		err = self.connect()
		if err == nil {
			// SUCCESS
			self.Log.Info("Connection established")
			return
		}

		self.Log.WithError(err).Error("Failed to connect, retrying in 1s")
		time.Sleep(time.Second)
		if self.IsStopping.Load() {
			return
		}
	}
}

func (self *Streamer) waitForListen() (err error) {
	self.cond.L.Lock()
	defer self.cond.L.Unlock()

	for !self.isListening {
		self.cond.Wait()
		if self.IsStopping.Load() {
			return errors.New("stopped")
		}
	}

	return
}

func (self *Streamer) run() (err error) {
	err = self.Resume()
	if err != nil {
		return
	}

	for {
		// Waits for notification unless task gets stopped or PAUSED
		msg, err := self.connection.WaitForNotification(self.ctxListen)
		if errors.Is(err, context.Canceled) {
			if self.IsStopping.Load() {
				// Stop() was called
				return nil
			}

			// Pause() was called
			err := self.connection.Unlisten(self.channelName)
			if err != nil {
				return err
			}

			err = self.waitForListen()
			if err != nil {
				return err
			}

			continue
		}

		if err != nil {
			self.Log.WithError(err).WithField("cause", self.connection.CauseOfDeath()).Error("Failed to wait for notification, reconnecting")
			self.reconnect()
		} else {
			// Send notification to output channel
			self.Output <- msg.Payload
		}
	}
}
