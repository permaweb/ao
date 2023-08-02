# Instructions for generating configuration for the sequencer network

1. Run the script `utils/init-chain.sh`. The script creates a configuration for 3 nodes: sequencer-0, sequencer-1, sequencer-2 in the `/tmp/init-chain` directory, and collects all the gentx files in the `all` directory. Additional information is logged to the file `out.txt`.
2. Then, the above configuration is copied to the corresponding directories in `network/local`.
3. The configuration files in these directories need to be reviewed and manually corrected. In particular, the IP addresses should be adjusted according to the Docker configuration, and the appropriate persistent peers should be set.
4. Verify if the network is functioning properly: `make docker-run`. 

Details of generating the genesis state: https://tutorials.cosmos.network/tutorials/9-path-to-prod/4-genesis.html