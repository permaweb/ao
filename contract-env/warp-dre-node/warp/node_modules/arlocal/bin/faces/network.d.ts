export interface NetworkInterface {
    network: string;
    version: number;
    release: number;
    queue_length: number;
    peers: number;
    height: number;
    current: string;
    blocks: number;
    node_state_latency: number;
}
