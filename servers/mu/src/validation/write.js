export default function validate (body) {
  const { txid, cid, data } = body

  if (!txid) {
    throw new Error('Please pass an txid in the post request (Transaction Id)')
  }

  if (!cid) {
    throw new Error('Please pass a cid in the post request (Contract Id)')
  }

  if (!data) {
    throw new Error('Please pass data in the post request (signed DataItem)')
  }
}
