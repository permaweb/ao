package tool

type Buffer struct {
	buf []byte
	idx int
}

func NewBuffer(buf []byte) *Buffer {
	return &Buffer{buf: buf, idx: 0}
}

func (self *Buffer) Write(data []byte) (n int, err error) {
	copy(self.buf[self.idx:], data)
	self.idx += len(data)
	return len(data), nil
}
