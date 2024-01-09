<script>
  import {
    createContract,
    createDataItemSigner,
    readState,
  } from "@permaweb/ao-sdk";

  // TODO: neeed a new contract source for new AO process
  let srcId = "dfccC-_ih0Xl2_zhj8pTIUZF03QNfV2xu68pVzxSIQ0";
  $: processId = null;
  $: processState = null;

  async function doCreateContract(name) {
    if (globalThis.arweaveWallet) {
      await globalThis.arweaveWallet.connect(["SIGN_TRANSACTION"]);
    }

    const result = await createContract({
      srcId,
      signer: createDataItemSigner(globalThis.arweaveWallet),
      tags: [
        { name: 'Title', value: 'ao test' },
        { name: 'Description', value: 'createContract' },
        { name: 'Type', value: 'Text' },
        { name: 'AO Demo Name', value: name },
        { name: 'inbox', value: JSON.stringify([]) }
      ]
    });
    console.log(result);
    processId = result
  }

  async function doReadState(process) {
    console.log(process);
    try {
      const result = await readState({ processId: process });
      processState = result;
    } catch (e) {
      console.log(e);
    }
  }
</script>

<h1>AO Demo</h1>
<hr />
<div>
  <h3>Step 1: Create Contracts</h3>
  <button on:click={() => doCreateContract("A")}>Create Contract A</button>
</div>
<hr />
<button
  on:click={() => doReadState(processId)}
>
  ReadState
</button
>
{#if processState}
  <div>{JSON.stringify(processState)}</div>
{/if}
