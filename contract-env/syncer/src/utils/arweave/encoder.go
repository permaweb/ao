package arweave

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
)

type Encoder struct {
	*bytes.Buffer
}

func NewEncoder() Encoder {
	return Encoder{Buffer: &bytes.Buffer{}}
}

func (self Encoder) Trim(val []byte) []byte {
	for i := 0; i < len(val); i++ {
		if val[i] != 0 {
			return val[i:]
		}
	}
	return []byte{0}
}

// Erlang's ar_serialize:encode_int
func (self Encoder) WriteUint64(val uint64, sizeBytes int) {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, val)
	buf = self.Trim(buf)
	self.WriteBuffer(buf, sizeBytes)
}

// Erlang's ar_serialize:encode_int but for big int
func (self Encoder) WriteBigInt(val BigInt, sizeBytes int) {
	buf := val.Bytes()
	buf = self.Trim(buf)
	self.WriteBuffer(buf, sizeBytes)
}

// Erlang's ar_serialize:encode_bin
func (self Encoder) WriteBuffer(val []byte, sizeBytes int) {
	buf := make([]byte, 8)
	size := uint64(len(val))
	binary.BigEndian.PutUint64(buf, size)
	self.Buffer.Write(buf[8-sizeBytes:])
	self.Buffer.Write(val)
}

func (self Encoder) encodeBin(val []byte, sizeBytes int) []byte {
	buf := make([]byte, 8)
	size := uint64(len(val))
	binary.BigEndian.PutUint64(buf, size)
	return append(buf[8-sizeBytes:], val...)
}

func (self Encoder) Write(val any, sizeBytes int) {
	switch x := val.(type) {
	case []byte:
		self.WriteBuffer(x, sizeBytes)
	case RewardAddr:
		self.WriteBuffer(x.Bytes(), sizeBytes)
	case Base64String:
		self.WriteBuffer([]byte(x), sizeBytes)
	case BigInt:
		if !x.Valid {
			// Undefined
			for i := 0; i < sizeBytes; i++ {
				self.WriteByte(0)
			}
			break
		}
		self.WriteBigInt(x, sizeBytes)
	case int64:
		self.WriteUint64(uint64(x), sizeBytes)
	case uint64:
		self.WriteUint64(x, sizeBytes)
	default:
		panic("unsupported encoder type")
	}
}

func (self Encoder) RawWrite(val any) {
	switch x := val.(type) {
	case byte:
		self.Buffer.WriteByte(x)
	case []byte:
		self.Buffer.Write(x)
	case Base64String:
		self.Buffer.Write(x.Bytes())
	case BigInt:
		self.Buffer.Write(x.Bytes())
	case uint64:
		self.RawWriteUint64(x)
	case []Base64String:
		self.RawWriteBase64StringSlice(x)
	default:
		panic("unsupported encoder raw type")
	}
}

func (self Encoder) RawWriteSize(val any, sizeBytes int) {
	switch x := val.(type) {
	case Base64String:
		self.RawWrite(x.Head(sizeBytes))
	case BigInt:
		buf := make([]byte, sizeBytes)
		x.FillBytes(buf)
		self.Buffer.Write(buf)
	case uint16:
		out := make([]byte, sizeBytes)
		binary.BigEndian.PutUint16(out, x)
		self.Buffer.Write(out)

	case uint64:
		out := make([]byte, sizeBytes)
		binary.BigEndian.PutUint64(out[sizeBytes-8:], x)
		self.Buffer.Write(out)
	default:
		panic("unsupported encoder raw type")
	}
}

func (self Encoder) WriteUint(val uint, sizeBytes int) {
	if sizeBytes == 1 {
		self.WriteUint8(uint8(val), sizeBytes)
		return
	} else if sizeBytes == 2 {
		self.WriteUint16(uint16(val), sizeBytes)
		return
	}

	panic("Unsupported size")
}

func (self Encoder) WriteUint8(val uint8, sizeBytes int) {
	self.WriteBuffer([]byte{byte(val)}, sizeBytes)
}

func (self Encoder) WriteUint16(val uint16, sizeBytes int) {
	buf := make([]byte, 2)
	binary.BigEndian.PutUint16(buf, val)
	self.WriteBuffer(buf, sizeBytes)
}

func (self Encoder) WriteSlice(val any, lenBytes, elemSizeBytes int) {
	switch x := val.(type) {
	case []any:
		self.WriteSliceAny(x, lenBytes, elemSizeBytes)
	case [][]byte:
		self.WriteSliceByte(x, lenBytes, elemSizeBytes)
	case []Base64String:
		self.WriteBase64StringSlice(x, lenBytes, elemSizeBytes)
	default:
		panic("unsupported encoder slice type")
	}
}

func (self Encoder) WriteSliceAny(bins []any, lenBytes, elemSizeBytes int) {
	var encodeBinList func(bins []any, encoded []byte, n int, lenBytes, elemSizeBytes int) []byte
	encodeBinList = func(bins []any, encoded []byte, n int, lenBytes, elemSizeBytes int) []byte {
		if len(bins) > 0 {
			// Still bins to encode
			b, ok := bins[0].([]byte)
			if !ok {
				panic("unsupported encoder type")
			}

			elem := self.encodeBin(b, elemSizeBytes)
			return encodeBinList(bins[1:], append(elem, encoded...), n+1, lenBytes, elemSizeBytes)
		}

		// No more bins to encode
		buf := make([]byte, 8)
		size := uint64(n)
		binary.BigEndian.PutUint64(buf, size)
		return append(buf[8-uint64(lenBytes):], encoded...)
	}
	buf := encodeBinList(bins, []byte{}, 0, lenBytes, elemSizeBytes)
	self.Buffer.Write(buf)
}

func (self Encoder) WriteSliceByte(bins [][]byte, lenBytes, elemSizeBytes int) {
	var encodeBinList func(bins [][]byte, encoded []byte, n int, lenBytes, elemSizeBytes int) []byte
	encodeBinList = func(bins [][]byte, encoded []byte, n int, lenBytes, elemSizeBytes int) []byte {
		if len(bins) > 0 {
			// Still bins to encode
			elem := self.encodeBin(bins[0], elemSizeBytes)
			return encodeBinList(bins[1:], append(elem, encoded...), n+1, lenBytes, elemSizeBytes)
		}

		// No more bins to encode
		buf := make([]byte, 8)
		size := uint64(n)
		binary.BigEndian.PutUint64(buf, size)
		return append(buf[8-uint64(lenBytes):], encoded...)
	}
	buf := encodeBinList(bins, []byte{}, 0, lenBytes, elemSizeBytes)
	self.Buffer.Write(buf)
}

func (self Encoder) WriteBase64StringSlice(bins []Base64String, lenBytes, elemSizeBytes int) {
	var encodeBinList func(bins []Base64String, encoded []byte, n int, lenBytes, elemSizeBytes int) []byte
	encodeBinList = func(bins []Base64String, encoded []byte, n int, lenBytes, elemSizeBytes int) []byte {
		if len(bins) > 0 {
			// Still bins to encode
			elem := self.encodeBin(bins[0], elemSizeBytes)
			return encodeBinList(bins[1:], append(elem, encoded...), n+1, lenBytes, elemSizeBytes)
		}

		// No more bins to encode
		buf := make([]byte, 8)
		size := uint64(n)
		binary.BigEndian.PutUint64(buf, size)
		return append(buf[8-uint64(lenBytes):], encoded...)
	}
	buf := encodeBinList(bins, []byte{}, 0, lenBytes, elemSizeBytes)
	self.Buffer.Write(buf)
}

// Erlang's binary:encode_unsigned
func (self Encoder) RawWriteUint64(val uint64) {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, val)
	buf = self.Trim(buf)
	self.Buffer.Write(buf)
}

func (self Encoder) RawWriteBase64StringSlice(val []Base64String) {
	for _, v := range val {
		self.Buffer.Write(v.Bytes())
	}
}

func (self Encoder) Base64() string {
	return base64.RawURLEncoding.EncodeToString(self.Bytes())
}
