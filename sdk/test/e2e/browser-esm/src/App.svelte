<script>
  import { readState } from "@permaweb/ao-sdk";

  export let PROCESS;
  $: processState = null;

  Promise.resolve()
    .then(() => console.log(`reading state for ${PROCESS}...`))
    // @ts-ignore
    .then(() => readState({ processId: PROCESS }))
    .then(res => {
      console.log(`read state for ${PROCESS}:`, res)
      processState = res
    })
    .catch(console.error)
</script>
  
<h1>AO Browser ESM Harness</h1>
<hr />
{#if processState}
  <div data-testid="process-state">JSON.stringify(processState)</div>
{/if}
