import { test, expect } from 'vitest'
import { act, waitFor, render, screen } from '@testing-library/svelte'

import App from './App.svelte'

const PROCESS = 'f6Ie4lnI-g_on29WbRSevAI8f6QTrlTXG1Xb0-TV_Sc'

test('integration - dryrun', async () => {
  await act(async () => render(App, { PROCESS }))

  await waitFor(() => {
    console.log('waiting for dryrun result to render...')
    screen.getByTestId('dryrun-result')
  }, {
    interval: 2000,
    timeout: 30000
  })

  const dryrunResultNode = screen.getByTestId('dryrun-result')
  expect(dryrunResultNode).toBeTruthy()
})
