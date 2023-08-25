package arweave

import (
	"database/sql/driver"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
)

type Base64String []byte

func (self *Base64String) UnmarshalJSON(data []byte) error {
	var s string
	err := json.Unmarshal(data, &s)
	if err != nil {
		return err
	}

	return self.Decode(s)
}

func (self *Base64String) Unmarshal(buf []byte) error {
	copy(*self, buf)
	return nil
}

func (self *Base64String) Decode(s string) error {
	// Decode base64
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return err
	}

	*self = []byte(b)
	return nil
}

func (self *Base64String) MarshalJSON() (out []byte, err error) {
	s := base64.RawURLEncoding.EncodeToString([]byte(*self))
	return json.Marshal(s)
}

func (self *Base64String) MarshalTo(buf []byte) (n int, err error) {
	if len(buf) < len(*self) {
		return 0, errors.New("buffer too small")
	}
	n = copy(buf, *self)
	return
}

func (self *Base64String) Scan(src interface{}) error {
	switch v := src.(type) {
	case string:
		return self.Decode(v)
	default:
		return fmt.Errorf("unsupported source type")
	}
}

func (self Base64String) Size() int {
	return len(self)
}

func (self Base64String) Value() (driver.Value, error) {
	return self.Base64(), nil
}

func (self Base64String) Bytes() []byte {
	return []byte(self)
}

func (self Base64String) Base64() string {
	return base64.RawURLEncoding.EncodeToString([]byte(self))
}

func (self Base64String) Head(i int) []byte {
	if i <= len(self) {
		return []byte(self)[:i]
	}

	// Pad with zeros
	i = len(self)
	return []byte(self)[:i]
}
