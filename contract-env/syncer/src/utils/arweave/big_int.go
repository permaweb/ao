package arweave

import (
	"encoding/json"
	"fmt"
	"math/big"
)

type BigInt struct {
	big.Int
	Valid bool
}

func (b BigInt) MarshalJSON() ([]byte, error) {
	return []byte(b.String()), nil
}

func (b *BigInt) UnmarshalJSON(p []byte) error {
	var s string
	err := json.Unmarshal(p, &s)
	if err != nil {
		return err
	}

	var z big.Int
	_, ok := z.SetString(s, 10)
	if !ok {
		return fmt.Errorf("not a valid big integer: %s", p)
	}
	b.Int = z
	b.Valid = true
	return nil
}
