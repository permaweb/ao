import { NOT_FOUND, back } from 'redux-first-router'

const components = {
  FEED: 'Feed',
  PLAYER: 'Player',
  [NOT_FOUND]: 'Feed'
}

export const routesMap = {
  FEED: {
    path: '/',
    thunk: async (dispatch, getState) => {
      console.log('Feed thunk.')
    }
  },
  PLAYER: {
    path: '/player/:tx',
    thunk: async (dispatch, getState) => {
      console.log('Player thunk.')
    }
  },
  NOT_FOUND: {
    path: '/'
  }
}

export const router = (dispatch) => {
  return {
    goBack: () => back(),
    goToFeed: () => dispatch({ type: 'FEED' }),
    goToPlayer: (tx) => dispatch({ type: 'PLAYER', payload: { tx } })
  }
}

export const mapStateToProps = (state, props) => {
  return {
    ...props,
    page: state.page,
    tx: state?.location?.payload?.tx,
    ticker: state?.location?.payload?.ticker,
    transaction: state?.location?.payload?.transaction
  }
}

export default (state = 'FEED', action = {}) => components[action.type] || state
