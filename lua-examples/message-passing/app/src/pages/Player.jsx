import { connect } from 'react-redux'
import { mapStateToProps, router } from '../store/router'

function Player ({ tx, goToFeed }) {
  return (
    <>
      <h1 className='text-3xl font-bold underline'>Player Page {tx}</h1>
      <p onClick={() => goToFeed()}>Go to feed</p>
    </>
  )
}

export default connect(mapStateToProps, router)(Player)
