export const transformToMap = (device) => (ctx) => {
  const result = ctx.res
  const map = {}

  if (device === 'relay@1.0') {
    if (typeof result === 'string') {
      return result
    }
  
    if (result.Output && result.Output.data) {
      map.Output = result.Output
    }
    if (result.Messages) {
      map.Messages = result.Messages.map((m) => {
        const miniMap = {}
        m.Tags.forEach((t) => {
          miniMap[t.name] = t.value
        })
        miniMap.Data = {
          text: () => Promise.resolve(m.Data),
          json: () => Promise.resolve(JSON.parse(m.Data))
          // binary: () => Promise.resolve(Buffer.from(m.Data))
        }
        miniMap.Target = m.Target
        miniMap.Anchor = m.Anchor
        return miniMap
      })
    }
    return map
  } else {
    map.process = ctx.process
    map.slot = ctx.slot
    const res = result
    let body = ''
    res.headers.forEach((v, k) => {
      map[k] = v
    })

    if (typeof res.body === 'string') {
      try {
        body = JSON.parse(res.body)

        if (body.Output) {
          map.Output = body.Output
        }
        if (body.Messages) {
          map.Messages = body.Messages.map((m) => {
            const miniMap = {}
            m.Tags.forEach((t) => {
              miniMap[t.name] = t.value
            })
            miniMap.Data = {
              text: () => Promise.resolve(m.Data),
              json: () => Promise.resolve(JSON.parse(m.Data))
              // import { Buffer as BufferShim } from 'buffer/index.js'
              // if (!globalThis.Buffer) globalThis.Buffer = BufferShim
              // binary: () => Promise.resolve(Buffer.from(m.Data))
            }
            miniMap.Target = m.Target
            miniMap.Anchor = m.Anchor
            return miniMap
          })
        }
      } catch (e) {
        map.body = { text: () => Promise.resolve(body) }
      }
    }
    return map
  }
}
