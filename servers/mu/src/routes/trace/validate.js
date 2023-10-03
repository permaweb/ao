export default function validate (req) {
  if (!req || !req.params || !req.params.id) {
    throw new Error('Please pass a contract id as query parameter')
  }
}
