package api

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"
	"net/http"

	"github.com/cosmos/cosmos-sdk/client"
	cryptotypes "github.com/cosmos/cosmos-sdk/crypto/types"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/warp-contracts/sequencer/x/sequencer/types"

	"github.com/warp-contracts/syncer/src/utils/bundlr"
)

type nonceHandler struct {
	ctx      client.Context
	validate *validator.Validate
}

type NonceRequest struct {
	SignatureType int    `json:"signature_type" validate:"required,oneof=1 3"`
	Owner         string `json:"owner" validate:"required,base64rawurl,min=87,max=683"`
}

type NonceResponse struct {
	Address string `json:"address"`
	Nonce   uint64 `json:"nonce"`
}

// The endpoint that returns the account address and nonce for the given fields of the DataItem:
// owner (in Base64URL format) and signature type.
func RegisterNonceAPIRoute(clientCtx client.Context, router *mux.Router) {
	router.Handle("/api/v1/nonce", nonceHandler{ctx: clientCtx, validate: validator.New()}).Methods("POST")
}

func (h nonceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var request NonceRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		BadRequestError(w, err, "request decoding error")
		return
	}

	err = h.validate.Struct(request)
	if err != nil {
		BadRequestError(w, err, "invalid request")
		return
	}

	publicKey, err := getPublicKey(request)
	if err != nil {
		BadRequestError(w, err, "public key problem")
		return
	}

	response := getAddressWithNonce(h.ctx, publicKey)
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		InternalServerError(w, err, "response encoding error")
		return
	}

	_, err = fmt.Fprintf(w, "%s", jsonResponse)
	if err != nil {
		InternalServerError(w, err, "response writing error")
		return
	}
	w.Header().Set("Content-Type", "application/json")
}

func getPublicKey(request NonceRequest) (key cryptotypes.PubKey, err error) {
	ownerBytes, err := base64.RawURLEncoding.DecodeString(request.Owner)
	if err != nil {
		return
	}

	signatureType := bundlr.SignatureType(request.SignatureType)
	return types.GetPublicKey(signatureType, ownerBytes)
}

func getAddressWithNonce(ctx client.Context, key cryptotypes.PubKey) NonceResponse {
	address := sdk.AccAddress(key.Address())
	response := NonceResponse{Address: address.String()}

	acc, err := ctx.AccountRetriever.GetAccount(ctx, address)
	if acc == nil || err != nil {
		// account does not exist
		response.Nonce = 0
	} else {
		response.Nonce = acc.GetSequence()
	}

	return response
}
