import Arweave from 'arweave';

(async function () {
  const pid = Arweave.utils.b64UrlToBuffer('2sWgl7kzGl1MlBvENlMri2PIWTuwzZ0sx2PpS18fFK4')
  const hash = await Arweave.crypto.hash(pid)
  const h = Arweave.utils.bufferTob64Url(hash)
  console.log(h)

  const mid = Arweave.utils.b64UrlToBuffer('GgJe1wbcyGgvOv0rOnw2kAikoK-p5WGHdCxH_isbrZg')
  const lastHash = Arweave.utils.b64UrlToBuffer('iRTGf7FBuKuJWoTOLZbARe9i7Q1N9b0R0iEljPdCH10')
  const all = Buffer.concat([mid, lastHash])
  const byteArray = Array.from(all)

  // Print the array of bytes
  console.log(byteArray)
  const mhash = await Arweave.crypto.hash(all)
  const h2 = Arweave.utils.bufferTob64Url(mhash)
  console.log(h2)
})()
