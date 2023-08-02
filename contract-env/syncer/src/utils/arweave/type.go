package arweave

type PeerList []string

type NetworkInfo struct {
	Network          string `json:"network"`
	Version          int64  `json:"version"`
	Release          int64  `json:"release"`
	Height           int64  `json:"height"`
	Current          string `json:"current"`
	Blocks           int64  `json:"blocks"`
	Peers            int64  `json:"peers"`
	QueueLength      int64  `json:"queue_length"`
	NodeStateLatency int64  `json:"node_state_latency"`
}

type Chunks struct {
	DataRoot []byte   `json:"data_root"`
	Chunks   []Chunk  `json:"chunks"`
	Proofs   []*Proof `json:"proofs"`
}

type Chunk struct {
	DataHash     []byte
	MinByteRange int
	MaxByteRange int
}

type Proof struct {
	Offest int
	Proof  []byte
}

type OffsetInfo struct {
	Offset BigInt `json:"offset"`
	Size   BigInt `json:"size"`
}

type ChunkData struct {
	Chunk    Base64String `json:"chunk"`
	TxPath   string       `json:"tx_path"`
	DataPath string       `json:"data_path"`
}
