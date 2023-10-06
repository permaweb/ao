import App from './App.svelte'

globalThis.localStorage.setItem('debug', '@permaweb/ao-sdk*')

// eslint-disable-next-line
new App({ target: document.body })