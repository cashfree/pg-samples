<script>
	import { load } from '@cashfreepayments/cashfree-js';
	import { onMount } from 'svelte';

	export let cardCvvField;
	export let cashfree;
	export let styleOptions;

	let cardOptions = {
		style: styleOptions
	};

	onMount(async function () {
		let cardComponent = cashfree.create('cardCvv', cardOptions);
		cardComponent.mount(cardCvvField);
	});
</script>

<div bind:this={cardCvvField}></div>
