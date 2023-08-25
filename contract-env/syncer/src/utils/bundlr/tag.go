package bundlr

import (
	"github.com/hamba/avro"
)

type Tag struct {
	Name  string `json:"name" avro:"name"`
	Value string `json:"value" avro:"value"`
}

type Tags []Tag

var avroParser = avro.MustParse(`{"type": "array", "items": {"type": "record", "name": "Tag", "fields": [{"name": "name", "type": "string"}, {"name": "value", "type": "string"}]}}`)

func (self Tags) Marshal() ([]byte, error) {
	if len(self) == 0 {
		return make([]byte, 0), nil
	}

	return avro.Marshal(avroParser, self)
}

func (self Tags) Unmarshal(data []byte) error {
	return avro.Unmarshal(avroParser, data, &self)
}

func (self Tags) Size() int {
	if len(self) == 0 {
		return 0
	}

	data, _ := self.Marshal()
	return len(data)
}
