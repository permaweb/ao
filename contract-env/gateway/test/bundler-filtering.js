const transactions = {
  edges: [
    {
      node: {
        owner: {
          address: 'I-5rWUehEv-MjdK9gFw09RxfSLQX9DIHxG614Wf8qo0',
        },
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        tags: [
          {
            name: 'Sequencer',
            value: 'RedStone',
          },
          {
            name: 'Sequencer-Owner',
            value: 'I-5rWUehEv-MjdK9gFw09RxfSLQX9DIHxG614Wf8qo0',
          },
          {
            name: 'Sequencer-Sort-Key',
            value: '000000860328,ced6c1f9fc9886dde090eb5ca0b830895acb04de8a8f25107d6abafc44137ae1',
          },
          {
            name: 'Sequencer-Tx-Id',
            value: 'DG6oxz7_XdG6gQ6zVorhsVqJ3H5qPsJEEH68ikGehU4',
          },
          {
            name: 'Sequencer-Block-Height',
            value: '860328',
          },
          {
            name: 'Sequencer-Block-Id',
            value: 'Q-qfD0w3CiiwXmO5ceVzyIEKX0RplJJ4rIVXMZ5RfD1xnqWNYJTp02WKva1LIRYh',
          },
          {
            name: 'App-Name',
            value: 'SmartWeaveAction',
          },
          {
            name: 'App-Version',
            value: '0.3.0',
          },
          {
            name: 'Contract',
            value: 'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY',
          },
          {
            name: 'Input',
            value: '{"function":"generate"}',
          },
        ],
        block: {
          id: 'aJQJm_ZL-1iCFMQBnd_8-W_0SDGVZKoTCBa0wqSBM-vbA5MUKtfal_Xq6390hapm',
          timestamp: 1643191970,
          height: 860332,
          previous: 'VNeKQy6SfFJM1QT76W454FKcYfteBdqQ5Vkh4ASKC66m0jlzm5v-xOUNXIYIlRma',
        },
        parent: {
          id: 'kCdI59JIWPp6VTC9IKbSr9dRVgd1MxLk3z10N3NnUX4',
        },
        bundledIn: {
          id: 'kCdI59JIWPp6VTC9IKbSr9dRVgd1MxLk3z10N3NnUX4',
        },
      },
    },
  ],
};

const txInfos = [];

txInfos.push(...transactions.edges.filter((tx) => !tx.node.parent?.id && !tx.node.bundledIn?.id));

console.log(txInfos);
