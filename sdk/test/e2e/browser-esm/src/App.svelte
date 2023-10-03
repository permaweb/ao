<script>
  import { readState } from "@permaweb/ao-sdk";

  export let CONTRACT;
  $: contractState = null;

  Promise.resolve()
    .then(() => console.log(`reading state for ${CONTRACT}...`))
    // @ts-ignore
    .then(() => readState(CONTRACT))
    .then(res => {
      console.log(`read state for ${CONTRACT}:`, res)
      contractState = res
    })
    .catch(console.error)
</script>
  
<h1>AO Browser ESM Harness</h1>
<hr />
{#if contractState}
  <div data-testid="contract-state">JSON.stringify(contractState)</div>
{/if}
