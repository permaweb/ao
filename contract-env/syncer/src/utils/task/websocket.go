package task

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"sync"
	"time"

	"nhooyr.io/websocket"

	"github.com/warp-contracts/syncer/src/utils/config"
)

type Websocket[T any] struct {
	*Watchdog

	Output chan *T

	// Config
	Url            string
	httpTransport  *http.Transport
	onConnected    func(ws *websocket.Conn) error
	onDisconnected func()
	maxMessageSize int64

	// Internal
	ws              *websocket.Conn
	isConnected     bool
	mtx             sync.Mutex
	lastMessageTime time.Time
}

// Maintains a persistent websocket connection to the sequencer
// Gets events that it subscribed for
func NewWebsocket[T any](config *config.Config, name string) (self *Websocket[T]) {
	self = new(Websocket[T])

	self.Output = make(chan *T)

	self.httpTransport = http.DefaultTransport.(*http.Transport).Clone()

	watched := func() *Task {
		return NewTask(self.Config, name).
			WithSubtaskFunc(self.run).
			WithOnBeforeStart(self.connect).
			WithOnStop(self.disconnect)
	}

	self.Watchdog = NewWatchdog(config).
		WithTask(watched).
		WithOnAfterStop(func() {
			close(self.Output)
		})

	return
}

func (self *Websocket[T]) WithUrl(url string) *Websocket[T] {
	self.Url = url
	return self
}

func (self *Websocket[T]) WithOnConnected(onConnected func(ws *websocket.Conn) error) *Websocket[T] {
	self.onConnected = onConnected
	return self
}

func (self *Websocket[T]) WithOnDisconnected(onDisconnected func()) *Websocket[T] {
	self.onDisconnected = onDisconnected
	return self
}

func (self *Websocket[T]) WithMaxMessageSize(maxMessageSize int64) *Websocket[T] {
	self.maxMessageSize = maxMessageSize
	return self
}

// Used to detect dead connections
// At least this often a message should be received
// Message may be PONG response for a PING request
func (self *Websocket[T]) WithMinTimeBetweenMessages(minTimeBetweenMessages time.Duration) *Websocket[T] {
	self.Watchdog.WithIsOK(minTimeBetweenMessages, func() bool {
		if time.Since(self.lastMessageTime) < minTimeBetweenMessages {
			return true
		}

		ctx, cancel := context.WithTimeout(self.Ctx, minTimeBetweenMessages)
		defer cancel()

		// Blocks til PONG is received or timeout
		err := self.ws.Ping(ctx)
		if errors.Is(err, context.DeadlineExceeded) {
			// Connection is not valid anymore
			self.Log.Warn("PING timeout")
			return false
		}
		if err != nil {
			self.Log.WithError(err).Warn("Failure in PING")
			return false
		}

		return true
	})
	return self
}

func (self *Websocket[T]) WithKeepAliveTimeout(v time.Duration) *Websocket[T] {
	self.httpTransport.DialContext = (&net.Dialer{
		Timeout:   v,
		KeepAlive: v,
	}).DialContext
	return self
}

func (self *Websocket[T]) connect() (err error) {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	// var resp *http.Response
	self.ws, _, err = websocket.Dial(self.Ctx, self.Url, &websocket.DialOptions{
		HTTPClient: &http.Client{
			Transport: self.httpTransport,
		},
	})
	if err != nil {
		return
	}

	self.ws.SetReadLimit(self.maxMessageSize)

	if self.onConnected != nil {
		err = self.onConnected(self.ws)
		if err != nil {
			return
		}
	}

	self.isConnected = true
	return
}

func (self *Websocket[T]) disconnect() {
	self.mtx.Lock()
	defer self.mtx.Unlock()

	err := self.ws.Close(websocket.StatusNormalClosure, "")
	if err != nil {
		return
	}

	if self.onDisconnected != nil {
		self.onDisconnected()
	}
	self.isConnected = false
}

func (self *Websocket[T]) read() (msg T, err error) {
	_, r, err := self.ws.Reader(self.Ctx)
	if err != nil {
		return
	}

	decoder := json.NewDecoder(r)
	err = decoder.Decode(&msg)
	if err != nil {
		return
	}

	return
}

func (self *Websocket[T]) run() (err error) {
	for {
		var msg T
		msg, err = self.read()
		if err != nil {
			return
		}

		select {
		case <-self.Ctx.Done():
			return
		case self.Output <- &msg:
		}
	}
}
