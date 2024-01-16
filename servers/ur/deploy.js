import { z } from 'zod'

function env (key) {
  const res = z.string().min(1).safeParse(process.env[key])
  if (!res.success) {
    console.error(`Error with ENV VAR: ${key}`)
    throw res.error
  }
  return res.data
}

const deploy = async (deployHooksStr) => {
  const deployHooks = z.preprocess(
    (arg) => (typeof arg === 'string' ? arg.split(',').map(str => str.trim()) : arg),
    z.array(z.string().url())
  ).parse(deployHooksStr)

  const responses = await Promise.all(deployHooks.map(
    (deployHook) => fetch(deployHook, { method: 'POST' })
      .then((res) => res.json())
      .catch((err) => err)
  ))

  console.log('Deploy Responses:', responses)
}

deploy(env('DEPLOY_HOOKS'))
