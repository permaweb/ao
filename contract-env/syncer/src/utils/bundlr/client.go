package bundlr

import (
	"context"
	"io"

	"github.com/warp-contracts/syncer/src/utils/bundlr/responses"
	"github.com/warp-contracts/syncer/src/utils/config"

	"github.com/go-resty/resty/v2"
)

type Client struct {
	*BaseClient
}

func NewClient(ctx context.Context, config *config.Bundlr) (self *Client) {
	self = new(Client)
	self.BaseClient = newBaseClient(ctx, config)
	return
}

func (self *Client) Upload(ctx context.Context, item *BundleItem) (out *responses.Upload, resp *resty.Response, err error) {
	reader, err := item.Reader()
	if err != nil {
		return
	}

	body, err := io.ReadAll(reader)
	if err != nil {
		return
	}

	req, cancel := self.Request(ctx)
	defer cancel()

	resp, err = req.
		SetBody(body).
		SetResult(&responses.Upload{}).
		ForceContentType("application/json").
		SetHeader("Content-Type", "application/octet-stream").
		SetHeader("x-proof-type", "receipt").
		Post("/tx")
	if err != nil {
		return
	}

	out, ok := resp.Result().(*responses.Upload)
	if !ok {
		err = ErrFailedToParse
		return
	}

	// self.log.WithField("resp", string(resp.Body())).Info("Uploaded to bundler")

	return
}

func (self *Client) GetStatus(ctx context.Context, id string) (out *responses.Status, err error) {
	if len(id) == 0 {
		err = ErrIdEmpty
		return
	}

	req, cancel := self.Request(ctx)
	defer cancel()

	resp, err := req.
		SetResult(&responses.Status{}).
		ForceContentType("application/json").
		SetPathParam("tx_id", id).
		Get("/tx/{tx_id}/status")
	if err != nil {
		return
	}

	out, ok := resp.Result().(*responses.Status)
	if !ok {
		err = ErrFailedToParse
		return
	}

	return
}
