package bundlr

type value string

const (
	// Setting this flag disables retrying request with peers
	ContextDisablePeers = value("disablePeers")

	// Forces the URL of the peer, otherwise the default one is picked
	ContextForcePeer = value("forcePeer")
)
