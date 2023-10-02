import { test, expect } from 'vitest'
import { act, waitFor, render, screen } from '@testing-library/svelte'

import App from './App.svelte'

const CONTRACT = 'VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro'

test('integration - readState', async () => {
  await act(async () => render(App, { CONTRACT }))

  await waitFor(() => {
    console.log('waiting for contract-state to render...')
    screen.getByTestId('contract-state')
  }, {
    interval: 2000,
    timeout: 30000
  })

  const contractStateNode = screen.getByTestId('contract-state')
  expect(contractStateNode).toBeTruthy()
})
