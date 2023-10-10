import { z } from 'zod'

function env (key) {
  const res = z.string().min(1).safeParse(process.env[key])
  if (!res.success) {
    console.error(`Error with ENV VAR: ${key}`)
    throw res.error
  }
  return res.data
}

const deploy = async (deployHook) => {
  const response = await fetch(deployHook, { method: 'POST' })
    .then((res) => res.json())
    .catch((err) => err)
  console.log('Deploying To Render. Response:', response)
}

deploy(env('DEPLOY_HOOK'))
