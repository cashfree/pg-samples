<script>
	import { load } from '@cashfreepayments/cashfree-js';
	import { onMount } from 'svelte';

	export let cardExpiryField;
	export let cashfree;
	export let styleOptions;

	let cardOptions = {
		style: styleOptions
	};

	onMount(async function () {
		let cardComponent = cashfree.create('cardExpiry', cardOptions);
		cardComponent.mount(cardExpiryField);
	});
</script>

<div bind:this={cardExpiryField}></div>
