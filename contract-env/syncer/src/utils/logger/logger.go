package logger

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/warp-contracts/syncer/src/utils/config"

	"os"

	"github.com/sirupsen/logrus"
)

const (
	ContextLoggerKey = "lg"
)

var logger *logrus.Logger

func init() {
	logger = logrus.New()
}

func Init(config *config.Config) (err error) {
	level, err := logrus.ParseLevel(config.LogLevel)
	if err != nil {
		return
	}
	logger.SetLevel(level)
	logger.SetOutput(os.Stdout)

	formatter := &logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02T15:04:05.999999999Z07:00",
	}
	logger.SetFormatter(formatter)

	return nil
}

func NewSublogger(tag string) *logrus.Entry {
	return logger.WithFields(logrus.Fields{"module": "warp." + tag})
}

func L() *logrus.Entry {
	return NewSublogger("misc")
}

func LOG(ctx context.Context) *logrus.Entry {
	value := ctx.Value(ContextLoggerKey)
	if value == nil {
		// logrus.Panic("No logger in context")
		return NewSublogger("unclassified")
	}

	log, ok := value.(*logrus.Entry)
	if !ok {
		logrus.Panic("Logger bad type")
	}

	return log
}

func LOGE(c *gin.Context, err error, status int) *logrus.Entry {
	c.Status(status)
	_ = c.Error(err)
	c.Abort()

	entry := LOG(c).WithError(err)

	return entry
}

func SetupLogger(c *gin.Context, fields logrus.Fields) {
	c.Set(ContextLoggerKey, NewSublogger("req").WithFields(fields).WithContext(c))
}
