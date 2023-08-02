package middleware

import (
	. "github.com/warp-contracts/syncer/src/utils/logger"

	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Starts a separate goroutine to process the c.Next() callback
// If it returns within timeout does nothing
func HandleTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// This context will stop pending operation after timeout, so it can free the resources
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)

		// Capacity needs to be 1 to enable finishing after timeout,
		// when no goroutine is listening
		finish := make(chan struct{}, 1)
		go func() {
			defer func() {
				if p := recover(); p != nil {
					finish <- struct{}{}
				}
			}()
			c.Next()
			finish <- struct{}{}
		}()

		select {
		case <-finish:
			return
		case <-ctx.Done():
			// FIXME: When request is finished this way it'll most probably try to write to the connection after some time and panic.
			err := errors.New("Request timed out")
			LOGE(c, err, http.StatusServiceUnavailable).WithField("timeout", timeout).Error("Handling request took too long")
		}
	}
}
