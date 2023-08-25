package types

// DONTCOVER

import (
	"cosmossdk.io/errors"
)

// x/sequencer module sentinel errors
var (
	ErrTooManyMessages        = errors.Register(ModuleName, 1100, "too many messages")
	ErrNotEmptyMemo           = errors.Register(ModuleName, 1101, "not empty memo")
	ErrNonZeroTimeoutHeight   = errors.Register(ModuleName, 1102, "non-zero timeout height")
	ErrHasExtensionOptions    = errors.Register(ModuleName, 1103, "has extension options")
	ErrNotSingleSignature     = errors.Register(ModuleName, 1104, "not single signature")
	ErrInvalidSignMode        = errors.Register(ModuleName, 1105, "invalid sign mode")
	ErrNotEmptySignature      = errors.Register(ModuleName, 1106, "not empty signature")
	ErrTooManySigners         = errors.Register(ModuleName, 1107, "too many signers")
	ErrPublicKeyMismatch      = errors.Register(ModuleName, 1108, "public key mismatch")
	ErrNoSequencerNonceTag    = errors.Register(ModuleName, 1109, "no sequencer nonce tag")
	ErrSequencerNonceMismatch = errors.Register(ModuleName, 1110, "sequencer nonce mismatch")
	ErrNonZeroGas             = errors.Register(ModuleName, 1111, "non-zero gas")
	ErrNonZeroFee             = errors.Register(ModuleName, 1112, "non-zero fee")
	ErrNotEmptyFeePayer       = errors.Register(ModuleName, 1113, "not empty fee payer")
	ErrNotEmptyFeeGranter     = errors.Register(ModuleName, 1114, "not empty fee granter")
	ErrNotEmptyTip            = errors.Register(ModuleName, 1115, "not empty tip")
)
