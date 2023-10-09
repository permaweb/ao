import { connect } from "react-redux"
import { mapStateToProps, router } from "../store/router"
import {
  readState,
  writeInteraction,
  createDataItemSigner,
} from "@permaweb/ao-sdk"
import { useEffect, useState } from "react"

function Feed({ goToPlayer }) {
  const signer = createDataItemSigner(globalThis.arweaveWallet)
  const [interactionId, setInteractionId] = useState()
  const [senderState, setSenderState] = useState()
  const [receiverState, setReceiverState] = useState()

  useEffect(() => {
    readState({
      contractId: import.meta.env.VITE_SENDER,
    })
      .then(setSenderState)
      .catch((e) => console.log(e))
  }, [])

  useEffect(() => {
    readState({
      contractId: import.meta.env.VITE_RECEIVER,
    })
      .then(setReceiverState)
      .catch((e) => console.log(e))
  }, [])

  return (
    <>
      <h1>Sender TX: {import.meta.env.VITE_SENDER}</h1>
      <h1
        onClick={() => goToPlayer("<player name>")}
        className="text-3xl font-bold underline"
      >
        Sender State:
      </h1>
      <p>{JSON.stringify(senderState)}</p>

      <h1
        onClick={() => goToPlayer("<player name>")}
        className="text-3xl font-bold underline"
      >
        Receiver State:
      </h1>
      <p>{JSON.stringify(receiverState)}</p>
      <div>
        <button
          onClick={async () => {
            if (globalThis.arweaveWallet) {
              await globalThis.arweaveWallet.connect(["SIGN_TRANSACTION"])
            }
            const interactionId = await writeInteraction({
              contractId: import.meta.env.VITE_SENDER,
              input: { function: "blah" },
              signer,
              tags: [],
            })
            setInteractionId(interactionId)
          }}
        >
          Send message
        </button>

        {interactionId && <h3>Ineraction ID: {interactionId}</h3>}
      </div>
    </>
  )
}

export default connect(mapStateToProps, router)(Feed)
