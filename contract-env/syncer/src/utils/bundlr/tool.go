package bundlr

import "encoding/binary"

func LongTo32ByteArray(long int) (out []byte) {
	buf := make([]byte, 32)
	binary.LittleEndian.PutUint64(buf, uint64(long))
	return buf
}

func LongTo8ByteArray(long int) (out []byte) {
	buf := make([]byte, 8)
	binary.LittleEndian.PutUint64(buf, uint64(long))
	return buf
}

func ShortTo2ByteArray(long int) []byte {
	buf := make([]byte, 2)
	binary.LittleEndian.PutUint16(buf, uint16(long))
	return buf
}
