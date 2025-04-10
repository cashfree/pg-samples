<script>
	import { load } from '@cashfreepayments/cashfree-js';
	import { onMount } from 'svelte';

	export let cardHolderField;
	export let cashfree;
	export let styleOptions;

	let cardOptions = {
		style: styleOptions
	};

	onMount(async function () {
		let cardComponent = cashfree.create('cardHolder', cardOptions);
		cardComponent.mount(cardHolderField);
	});
</script>

<div bind:this={cardHolderField}></div>
