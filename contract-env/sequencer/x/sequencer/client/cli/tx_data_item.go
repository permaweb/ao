package cli

import (
	"crypto/rand"
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/spf13/cobra"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/flags"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/warp-contracts/sequencer/x/sequencer/types"

	"github.com/warp-contracts/syncer/src/utils/bundlr"
	"github.com/warp-contracts/syncer/src/utils/warp"
)

var _ = strconv.Itoa(0)

const (
	FlagEthereumPrivateKey = "ethereum-private-key"
	FlagArweaveWallet      = "arweave-wallet"
	FlagData               = "data"
	FlagTag                = "tag"
)

func CmdDataItem() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "dataitem",
		Short: "Broadcast message in Arweave's DataItem format, described in ANS-104",
		Args:  cobra.ExactArgs(0),
		RunE: func(cmd *cobra.Command, args []string) (err error) {
			clientCtx, err := client.GetClientTxContext(cmd)
			if err != nil {
				return
			}

			msg, err := createMsgDataItem(clientCtx, cmd)
			if err != nil {
				return
			}

			// validates the message and sends it out
			clientCtx = clientCtx.WithBroadcastMode(cmd.Flag(flags.FlagBroadcastMode).Value.String())
			res, err := types.BroadcastDataItem(clientCtx, *msg)
			if err != nil {
				return
			}
			return clientCtx.PrintProto(res)
		},
	}

	cmd.Flags().String(FlagArweaveWallet, "", "Path to an Arweave wallet. Defaults to ./wallet.json")
	cmd.Flags().String(FlagEthereumPrivateKey, "", "Hex encoded private key for the Ethereum account. Defaults to ./ethereum.bin")
	cmd.Flags().StringP(FlagData, "d", "", "File with the binary data")
	cmd.Flags().StringArrayP(FlagTag, "t", []string{}, "One tag - a pair in the form of key=value. You can specify multiple tags. Example -t someKey=someValue -t someOtherKey=someValue")
	cmd.Flags().StringP(flags.FlagBroadcastMode, "b", flags.BroadcastSync, "Transaction broadcasting mode (sync|async)")
	return cmd
}

func createMsgDataItem(clientCtx client.Context, cmd *cobra.Command) (msg *types.MsgDataItem, err error) {
	// Message
	msg = &types.MsgDataItem{}

	// Data item may be signed with either Arweave or Ethereum private key
	arweaveWalletPath := cmd.Flag(FlagArweaveWallet).Value.String()
	ethereumPrivateKeyPath := cmd.Flag(FlagEthereumPrivateKey).Value.String()
	if (arweaveWalletPath == "" && ethereumPrivateKeyPath == "") || (arweaveWalletPath != "" && ethereumPrivateKeyPath != "") {
		err = errors.New("exactly one ethereum private key or arweave wallet is required")
		return
	}

	// Create a signer
	var (
		buf    []byte
		signer bundlr.Signer
	)
	if arweaveWalletPath != "" {
		// Read the wallet and parse it into a signer
		buf, err = os.ReadFile(arweaveWalletPath)
		if err != nil {
			return
		}

		signer, err = bundlr.NewArweaveSigner(string(buf))
		if err != nil {
			return
		}
		msg.DataItem.SignatureType = bundlr.SignatureTypeArweave
	} else {
		buf, err = os.ReadFile(ethereumPrivateKeyPath)
		if err != nil {
			return
		}

		signer, err = bundlr.NewEthereumSigner(string(buf))
		if err != nil {
			return
		}
		msg.DataItem.SignatureType = bundlr.SignatureTypeEthereum
	}

	// Get tags from flags
	values, err := cmd.Flags().GetStringArray(FlagTag)
	if err != nil {
		return
	}

	for _, value := range values {
		tag := bundlr.Tag{}
		_, err = fmt.Scanf(value, "%s=%s", &tag.Name, &tag.Value)
		if err != nil {
			return
		}
		msg.DataItem.Tags = append(msg.DataItem.Tags, tag)
	}

	// Add nonce tag
	sequence, err := getAccountSequence(clientCtx, msg, signer)
	if err != nil {
		return
	}
	tag := bundlr.Tag{Name: warp.TagSequencerNonce, Value: strconv.FormatUint(sequence, 10)}
	msg.DataItem.Tags = append(msg.DataItem.Tags, tag)

	// Read data
	msg.DataItem.Data, err = os.ReadFile(cmd.Flag(FlagData).Value.String())
	if err != nil {
		return
	}

	// Random anchor
	msg.DataItem.Anchor = make([]byte, 32)
	n, err := rand.Read(msg.DataItem.Anchor)
	if n != 32 {
		err = errors.New("failed to generate random anchor")
		return
	}
	if err != nil {
		return
	}

	// Sign the data item
	err = msg.DataItem.Sign(signer)
	if err != nil {
		return
	}

	return
}

// Returns the sequence for the account or 0 if the account does not exist
func getAccountSequence(clientCtx client.Context, msg *types.MsgDataItem, signer bundlr.Signer) (uint64, error) {

	key, err := types.GetPublicKey(msg.DataItem.SignatureType, signer.GetOwner())
	if err != nil {
		return 0, err
	}

	acc, err := clientCtx.AccountRetriever.GetAccount(clientCtx, sdk.AccAddress(key.Address()))
	if acc == nil || err != nil {
		// account does not exist
		return 0, nil
	}

	return acc.GetSequence(), nil
}
