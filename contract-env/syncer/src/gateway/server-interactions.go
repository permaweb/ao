package gateway

import (
	"net/http"
	"time"

	"github.com/warp-contracts/syncer/src/utils/binder"
	. "github.com/warp-contracts/syncer/src/utils/logger"
	"github.com/warp-contracts/syncer/src/utils/model"
	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
	"github.com/warp-contracts/syncer/src/gateway/request"
	"github.com/warp-contracts/syncer/src/gateway/response"
)

func (self *Server) onGetInteractions(c *gin.Context) {
	var in = new(request.GetInteractions)
	err := c.ShouldBindWith(in, binder.JSON)
	if err != nil {
		LOGE(c, err, http.StatusBadRequest).Error("Failed to parse request")
		return
	}

	// Defaults
	if in.Limit == 0 {
		in.Limit = 10000
	}

	// Wait for the current widnow to finish if End is in the future
	delta := int64(in.End) - int64(time.Now().UnixMilli())
	if delta > 0 {
		delta += 2000 // 2s margin for clock skew between GW and DB
		delta += 100  // 100ms margin of the request handling done so far
		if delta > self.Config.Gateway.ServerRequestTimeout.Milliseconds() {
			// Request would timeout before the window is finished
			LOGE(c, nil, http.StatusBadRequest).Error("End timestamp is too far in the future")
			return
		}

		t := time.NewTimer(time.Duration(delta) * time.Millisecond)
		select {
		case <-c.Done():
			// Request is cancelled
			return
		case <-t.C:
			// Window is finished, continue
		}
	}

	var interactions []*model.Interaction
	err = self.db.WithContext(self.Ctx).
		Transaction(func(tx *gorm.DB) (err error) {
			query := self.db.Table(model.TableInteraction).
				Joins("JOIN contracts ON interactions.contract_id = contracts.contract_id").
				Where("interactions.sync_timestamp >= ?", in.Start).
				Where("interactions.sync_timestamp < ?", in.End).
				Limit(in.Limit).
				Offset(in.Offset).
				Order("interactions.sort_key ASC")

			if len(in.SrcIds) > 0 {
				query = query.Where("contracts.src_tx_id IN ?", in.SrcIds)
			}

			err = query.Find(&interactions).Error

			return
		})
	if err != nil {
		LOGE(c, err, http.StatusInternalServerError).Error("Failed to fetch interactions")
		// Update monitoring
		self.monitor.GetReport().Gateway.Errors.DbError.Inc()
		return
	}

	// Update monitoring
	self.monitor.GetReport().Gateway.State.InteractionsReturned.Add(uint64(len(interactions)))

	c.JSON(http.StatusOK, response.InteractionsToResponse(interactions))
}
