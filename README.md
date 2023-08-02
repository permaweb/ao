# HyperBEAM - SmartWeave Contract Interoperability Platform

HyperBEAM takes a messaging based approach to interoperability with contracts. Having a decentralized deterministic execution environment is a challenge. Interoperability is a requirement for execution environments, we want to build small units of logic that focuses on their state, these units of logic are called "smart contracts", but we think of them as processes. These processes can only mutate or modify their state and no one else can change their state unless the call the process. But these processes need to interact with other processes. How?

Message passing, each process has a handle input function that receives messages from other processes, the process handles that function and has the ability to send messages via an outbox. A lot like we think of email, each of our email clients can receive messages, we can process the message and the completion of that action could result in a new state and/or new outbound messages to other processes. As those processes receive the messages, they process and modify their state with a potential result of one or more messages to one or more processes.

This system enables each process/contract to exist in isolation while communicating with the rest of the environment, if a process/contract is not available, the system can spawn that process/contract and then submit the message.


## Projects

- [Developer CLI](dev-cli)

## Contributing

SEE [CONTRIBUTING](CONTRIBUTING.md)

## License 

SEE [LICENSE](LICENSE)

