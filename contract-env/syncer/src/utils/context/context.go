package utils

import (
	"context"

	"github.com/gin-gonic/gin"
)

func SetRequestID(c *gin.Context, requestID string) {
	c.Set(ContextRequestIDKey, requestID)
}

func GetRequestID(ctx context.Context) string {
	requestID, ok := ctx.Value(ContextRequestIDKey).(string)
	if !ok {
		return ""
	}
	return requestID
}
