import assert from 'node:assert/strict'
import { test } from 'node:test'

import { configCacheWith, fetchConfigWith, rateLimitConfigWith, s3Region } from './config-file.js'

const location = 'https://legacy-limit-config.s3.us-west-1.amazonaws.com/config%20file//ips.json?versionId=one%2Btwo&tag=a&tag=b'
const signingDate = new Date('2026-10-27T12:00:00Z')
const roleCredentials = { accessKeyId: 'ROLEEXAMPLE', secretAccessKey: 'example-secret', sessionToken: 'example-session' }

for (const [url, region] of [
  [location, 'us-west-1'],
  ['https://bucket.s3.amazonaws.com/ips.json', 'us-east-1'],
  ['https://s3.us-west-1.amazonaws.com/bucket/ips.json', 'us-west-1'],
  ['https://bucket.s3-us-west-1.amazonaws.com/ips.json', 'us-west-1'],
  ['https://bucket.s3.dualstack.us-west-1.amazonaws.com/ips.json', 'us-west-1'],
  ['https://bucket.s3.cn-north-1.amazonaws.com.cn/ips.json', 'cn-north-1'],
  ['https://bucket.s3.us-gov-west-1.amazonaws.com/ips.json', 'us-gov-west-1'],
  ['http://bucket.s3.us-west-1.amazonaws.com/ips.json', null],
  ['https://bucket.s3.us-west-1.amazonaws.com.evil.test/ips.json', null],
  ['https://bucket.s3-website-us-west-1.amazonaws.com/ips.json', null],
  ['https://example.com/ips.json', null],
  ['https://user:password@bucket.s3.us-west-1.amazonaws.com/ips.json', null],
  [`${location}&X-Amz-Signature=existing`, null],
  [`${location}&AWSAccessKeyId=existing&Signature=existing`, null]
]) {
  test(`S3 authentication scope: ${url}`, () => {
    assert.equal(s3Region(new URL(url), 'us-east-1'), region)
  })
}

for (const url of [location, 'http://config.internal/ips.json', 'https://config.example/ips.json', `${location}&X-Amz-Signature=existing`]) {
  test(`public or presigned config needs no IAM credentials: ${url}`, async () => {
    const read = fetchConfigWith({
      credentials: () => assert.fail('must not load AWS credentials'),
      fetch: async (input, options) => {
        assert.equal(input, url)
        assert.ok(options.signal instanceof AbortSignal)
        assert.equal(options.headers, undefined)
        return Response.json(['1.2.3.4'])
      }
    })
    assert.deepEqual(await read(url), ['1.2.3.4'])
  })
}

test('private S3 retries with SigV4, preserving path, query, session token and disabling redirects', async () => {
  const requests = []
  const read = fetchConfigWith({
    signingDate,
    credentials: async () => roleCredentials,
    fetch: async (input, options) => {
      requests.push({ input, options })
      return requests.length === 1 ? new Response('AccessDenied', { status: 403 }) : Response.json(['1.2.3.4'])
    }
  })
  assert.deepEqual(await read(location), ['1.2.3.4'])
  assert.equal(requests.length, 2)
  assert.equal(requests[1].input, location)
  const { headers, redirect } = requests[1].options
  assert.equal(redirect, 'error')
  assert.equal(headers.host, 'legacy-limit-config.s3.us-west-1.amazonaws.com')
  assert.equal(headers['x-amz-security-token'], roleCredentials.sessionToken)
  assert.equal(headers['x-amz-date'], '20261027T120000Z')
  assert.match(headers.authorization, /^AWS4-HMAC-SHA256 Credential=ROLEEXAMPLE\/20261027\/us-west-1\/s3\/aws4_request,/)
  assert.match(headers.authorization, /SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token/)
  assert.ok(!headers.authorization.includes(roleCredentials.secretAccessKey))
})

test('global S3 endpoint uses the bucket region returned by S3', async () => {
  let calls = 0
  const read = fetchConfigWith({
    credentials: async () => roleCredentials,
    fetch: async (_, options) => {
      if (++calls === 1) return new Response('', { status: 403, headers: { 'x-amz-bucket-region': 'us-west-1' } })
      assert.match(options.headers.authorization, /\/us-west-1\/s3\//)
      return Response.json({})
    }
  })
  await read('https://bucket.s3.amazonaws.com/config.json')
})

test('role credentials are resolved again for each refresh', async () => {
  let credentialCalls = 0
  let calls = 0
  const read = fetchConfigWith({
    credentials: async () => ({ ...roleCredentials, accessKeyId: `ROLE${++credentialCalls}` }),
    fetch: async (_, options) => {
      if (++calls % 2 === 1) return new Response('', { status: 403 })
      assert.match(options.headers.authorization, new RegExp(`Credential=ROLE${credentialCalls}/`))
      return Response.json({})
    }
  })
  await read(location)
  await read(location)
  assert.equal(credentialCalls, 2)
})

for (const url of ['https://example.com/config.json', 'http://bucket.s3.us-west-1.amazonaws.com/config.json', `${location}&X-Amz-Signature=existing`]) {
  test(`access denied never sends AWS credentials outside the signing scope: ${url}`, async () => {
    const read = fetchConfigWith({
      credentials: () => assert.fail('must not load AWS credentials'),
      fetch: async () => new Response('', { status: 403 })
    })
    await assert.rejects(read(url), /HTTP 403/)
  })
}

test('signed failures and missing credentials propagate instead of yielding empty config', async () => {
  const read = fetchConfigWith({ credentials: async () => roleCredentials, fetch: async () => new Response('', { status: 403 }) })
  await assert.rejects(read(location), /HTTP 403/)
  const noCredentials = fetchConfigWith({
    credentials: async () => { throw new Error('No role available') },
    fetch: async () => new Response('', { status: 403 })
  })
  await assert.rejects(noCredentials(location), /No role available/)
})

test('invalid JSON and non-403 HTTP failures propagate without loading credentials', async () => {
  for (const response of [new Response('invalid json'), new Response('{}', { status: 500 }), new Response('{}', { status: 404 })]) {
    const read = fetchConfigWith({
      credentials: () => assert.fail('must not load AWS credentials'),
      fetch: async () => response
    })
    await assert.rejects(read(location))
  }
})

test('refresh retains the last valid config after read and validation failures', async () => {
  const good = { processes: { processId: { su: 'https://su.example' } } }
  let outcome = good
  const cache = configCacheWith({
    location,
    validate: value => !!value?.processes,
    read: async () => {
      if (outcome instanceof Error) throw outcome
      return outcome
    }
  })
  await cache.refresh()
  assert.equal(cache.get(), good)
  outcome = new Error('Access denied')
  await assert.rejects(cache.refresh(), /Access denied/)
  assert.equal(cache.get(), good)
  outcome = {}
  await assert.rejects(cache.refresh(), /Invalid config/)
  assert.equal(cache.get(), good)
  outcome = { processes: {} }
  await cache.refresh()
  assert.equal(cache.get(), outcome)
})

test('initial config failure is returned to startup and disabled URLs perform no reads', async () => {
  const cache = configCacheWith({
    location,
    validate: () => true,
    read: async () => { throw new Error('No IAM role available') }
  })
  await assert.rejects(cache.refresh(), /No IAM role available/)
  assert.equal(cache.get(), null)
  const disabled = configCacheWith({ location: '', read: () => assert.fail('disabled config must not be fetched'), initialValue: {} })
  await disabled.refresh()
  assert.deepEqual(disabled.get(), {})
})

test('worker rate limits keep their startup snapshot and refresh from private S3 with IAM', async () => {
  const initial = { default: 10 }
  const updated = { default: 20 }
  let calls = 0
  let fail = false
  const cache = rateLimitConfigWith({
    location,
    initialValue: initial,
    read: fetchConfigWith({
      credentials: async () => roleCredentials,
      fetch: async (_, options) => {
        if (fail) throw new Error('S3 unavailable')
        if (++calls % 2 === 1) return new Response('', { status: 403 })
        assert.match(options.headers.authorization, /Credential=ROLEEXAMPLE\//)
        return Response.json(updated)
      }
    })
  })
  assert.equal(cache.get(), initial)
  await cache.refresh()
  assert.deepEqual(cache.get(), updated)
  fail = true
  await assert.rejects(cache.refresh(), /S3 unavailable/)
  assert.deepEqual(cache.get(), updated)
})
