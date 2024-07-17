<script>
  import { dryrun } from "@permaweb/aoconnect";

  export let PROCESS;
  $: dryrunResult = null;

  Promise.resolve()
    .then(() => console.log(`reading state for ${PROCESS}...`))
    // @ts-ignore
    .then(() => dryrun({
      process: PROCESS,
      data: 'ao.id',
      tags: [
        { name: 'Action', value: 'Eval' },
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Variant', value: 'ao.TN.1' },
        { name: 'Type', value: 'Message' },
        { name: 'SDK', value: 'aoconnect' }
      ],
      From: 'NlSfGLmEEwRfV2ITvj7QaCcJu59QSPGZ8_rSuioAQKA',
      Owner: 'NlSfGLmEEwRfV2ITvj7QaCcJu59QSPGZ8_rSuioAQKA',
      Anchor: '0'
    }))
    .then(res => {
      console.log(`dryrun for ${PROCESS}:`, res)
      dryrunResult = res
    })
    .catch(console.error)
</script>
  
<h1>AO Browser ESM Harness</h1>
<hr />
{#if dryrunResult}
  <div data-testid="dryrun-result">JSON.stringify(processState)</div>
{/if}
