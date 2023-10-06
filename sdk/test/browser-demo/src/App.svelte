<script>
  import {
    createContract,
    createDataItemSigner,
    readState,
  } from "@permaweb/ao-sdk";

  import Arweave from 'arweave'

  import { onMount } from 'svelte'

  // contract src
  let srcId = "dfccC-_ih0Xl2_zhj8pTIUZF03QNfV2xu68pVzxSIQ0";
  $: contractId = null;
  $: contractState = null;


  onMount(() => {
    globalThis.arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https'
    })
  })

  async function doCreateContract(name) {
    if (globalThis.arweaveWallet) {
      await globalThis.arweaveWallet.connect(["SIGN_TRANSACTION", "DISPATCH"]);
    }

    const result = await createContract({
      srcId,
      initialState: { inbox: [] },
      signer: createDataItemSigner(globalThis.arweaveWallet),
      tags: [
        { name: 'Title', value: 'ao test' },
        { name: 'Description', value: 'createContract' },
        { name: 'Type', value: 'Text' },
        { name: 'AO Demo Name', value: name }
      ]
    });
    console.log(result);
    contractId = result
  }

  async function doReadState(contract) {
    console.log(contract);
    try {
      const result = await readState({ contractId: contract });
      contractState = result;
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
  on:click={() => doReadState(contractId)}
>
  ReadState
</button
>
{#if contractState}
  <div>{JSON.stringify(contractState)}</div>
{/if}
