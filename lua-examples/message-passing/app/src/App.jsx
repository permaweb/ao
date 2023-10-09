import { connect } from 'react-redux'
import { mapStateToProps } from './store/router'

import loadable from '@loadable/component'

const pages = {
  Feed: loadable(() => import('./pages/Feed'), {
    resolveComponent: (c) => c.default
  }),
  Player: loadable(() => import('./pages/Player'), {
    resolveComponent: (c) => c.default
  })
}

function App ({ page }) {
  const Component = pages[page || 'Feed']
  return (
    <>
      <h1 className='text-3xl font-bold underline'>Header</h1>
      <Component />
      <h1>Footer</h1>
    </>
  )
}

export default connect(mapStateToProps)(App)
