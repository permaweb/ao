const {ObjectState} = require('object-rollback');

class SmartWeaveGlobal {
  get owner() {
    return 'ppe';
  }
}

// base contract that must be extended by all contracts
// - contains methods for commit/rollback the state
class JsWarpContract {
  state
  smartweave
  #objectState

  constructor(state, smartweave) {
    this.state = state;
    this.#objectState = new ObjectState(state);
    this.smartweave = smartweave;
  }

  // to be called by SDK
  get currentState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  // to be called by SDK
  commit() {
    this.#objectState = new ObjectState(this.state);
  }

  // to be called by SDK
  rollback() {
    this.#objectState.rollback();
  }
}

// example contract
class WarpPst extends JsWarpContract {
  constructor(initialState, smartweave) {
    super(initialState, smartweave);
  }

  transfer(target, qty) {
    this.#transfer(target, qty);
  }

  transferAndThrow(target, qty) {
    this.#transfer(target, qty);
    throw new Error('Oops!');
  }

  #transfer(target, qty) {
    if (!Reflect.has(this.state.balances, target)) {
      this.state.balances[target] = 0;
    }
    this.state.balances[target] += qty;
    this.state.balances[this.smartweave.owner] -= qty;
  }
}


function main() {
  // contract instance
  const pst = new WarpPst({
    name: 'just_ppe',
    ticker: 'ppe',
    balances: {
      ppe: 100000000
    }
  }, new SmartWeaveGlobal());

  const interactions = [
    {
      id: "1",
      function: 'transfer',
      args: {
        target: 'jzi',
        qty: 100
      }
    },
    {
      id: "2",
      function: 'transfer',
      args: {
        target: 'jwo',
        qty: 200
      }
    },
    {
      id: "3",
      function: 'transferAndThrow',
      args: {
        target: 'xyz',
        qty: 300
      }
    }
  ];

  console.log('State before', pst.currentState);

  // sdk code
  interactions.forEach((i) => {
    try {
      Reflect.get(pst, i.function).apply(pst, [i.args.target, i.args.qty]);
      console.log(`State after ${i.id}`, pst.currentState);
      pst.commit();
    } catch (e) {
      console.error(e.message);
      pst.rollback();
    }
  });

  console.log(`End state`, pst.currentState);
}

main();

