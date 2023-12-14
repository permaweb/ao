import Arweave from 'arweave';

(async function () {
  const pid = Arweave.utils.b64UrlToBuffer('kRIwKM5cLvEDWmgbZ8OSDT1SFdJaWQJgtpCJayDd7_4')
  const hash = await Arweave.crypto.hash(pid)
  const h = Arweave.utils.bufferTob64Url(hash)
  console.log(h)

  const mid = Arweave.utils.b64UrlToBuffer('6V-WTZpUEtzyeFur03Hgfl3GkikG5kVS44nJ366GKQg' + 'NCd1EuUNlH0O2O8eaJgFxrGNja0QhHpOWCwLDzFnFcA')
  const mhash = await Arweave.crypto.hash(mid)
  const h2 = Arweave.utils.bufferTob64Url(mhash)
  console.log(h2)
})()
