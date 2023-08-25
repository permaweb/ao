# Warp's sequencer
**sequencer** is a blockchain used for sequencing Warp interactions. 

## Local development
For local development you can use the usual `ignite chain serve` or a preconfigured local network of 3 nodes started with:

```
# Start the network
make docker-run

# Verify 3 validators are running
curl http://localhost:1317/cosmos/staking/v1beta1/validators 

# Check the status of each node
./bin/sequencer status
./bin/sequencer status --node tcp://localhost:26667
./bin/sequencer status --node tcp://localhost:26677

```
