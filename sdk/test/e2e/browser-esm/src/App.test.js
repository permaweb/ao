import { test, expect } from 'vitest'
import { act, waitFor, render, screen } from '@testing-library/svelte'

import App from './App.svelte'

// TODO: need a new AO process
const PROCESS = 'VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro'

test('integration - readState', async () => {
  await act(async () => render(App, { CONTRACT: PROCESS }))

  await waitFor(() => {
    console.log('waiting for process-state to render...')
    screen.getByTestId('process-state')
  }, {
    interval: 2000,
    timeout: 30000
  })

  const processStateNode = screen.getByTestId('process-state')
  expect(processStateNode).toBeTruthy()
})
