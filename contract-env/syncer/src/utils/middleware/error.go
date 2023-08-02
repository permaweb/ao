package middleware

import (
	"net/http"
	"time"

	context_utils "github.com/warp-contracts/syncer/src/utils/context"

	"github.com/gin-gonic/gin"
)

type ErrorInfo struct {
	Code    int
	Message string
}

type ErrorResponse struct {
	RequestId string
	Timestamp time.Time
	Errors    []ErrorInfo
}

func (self ErrorInfo) Error() string {
	return self.Message
}

func getErrorInfo(c *gin.Context) (out []ErrorInfo) {
	status := c.Writer.Status()
	if len(c.Errors) == 0 {
		message := http.StatusText(status)
		out = []ErrorInfo{{Code: status, Message: message}}
	} else {
		out = []ErrorInfo{}
		for _, err := range c.Errors {
			switch e := err.Err.(type) {
			case ErrorInfo:
				out = append(out, e)
			default:
				out = append(out, ErrorInfo{Code: status, Message: err.Error()})
			}
		}
	}
	return
}

// Handle returns middleware that returns json error messages
// when request ended with non-200
func HandleErrors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check for the errors
		status := c.Writer.Status()
		if status >= 200 && status < 300 {
			return
		}

		var out ErrorResponse
		out.RequestId = c.GetString(context_utils.ContextRequestIDKey)
		out.Timestamp = time.Now()

		// Return a generic message if there's no error set
		if len(c.Errors) == 0 {
			out.Errors = []ErrorInfo{{
				Code:    status,
				Message: http.StatusText(status),
			}}
		} else {
			infos := getErrorInfo(c)

			for _, info := range infos {
				out.Errors = append(out.Errors, ErrorInfo{
					Code:    info.Code,
					Message: info.Message,
				})
			}
		}
		c.AbortWithStatusJSON(status, out)
	}
}
