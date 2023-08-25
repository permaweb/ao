package arweave

import (
	"github.com/warp-contracts/syncer/src/utils/logger"

	"github.com/sirupsen/logrus"
)

// Transforms all logs to debug
type Logger struct {
	log          *logrus.Entry
	isForceTrace bool
}

func NewLogger(isForceTrace bool) (self *Logger) {
	self = new(Logger)
	self.log = logger.NewSublogger("arweave-resty")
	self.isForceTrace = isForceTrace
	return
}

func (self *Logger) Errorf(format string, v ...interface{}) {
	if self.isForceTrace {
		self.log.Tracef(format, v...)
	} else {
		self.log.Errorf(format, v...)
	}
}

func (self *Logger) Warnf(format string, v ...interface{}) {
	if self.isForceTrace {
		self.log.Tracef(format, v...)
	} else {
		self.log.Warnf(format, v...)
	}
}

func (self *Logger) Debugf(format string, v ...interface{}) {
	if self.isForceTrace {
		self.log.Tracef(format, v...)
	} else {
		self.log.Debugf(format, v...)
	}
}
