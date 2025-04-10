<script>
	import { load } from '@cashfreepayments/cashfree-js';
	import { onMount } from 'svelte';
	//svelte dispatch
	import { createEventDispatcher } from 'svelte';

	//create dispatcher
	const dispatch = createEventDispatcher();

	export let cardNumberField;
	export let cashfree;
	export let styleOptions;
	let cardComponent;

	let cardOptions = {
		values: {
			placeholder: 'Enter Card Number'
		},
		style: styleOptions
	};

	onMount(async function () {
		cardComponent = cashfree.create('cardNumber', cardOptions);
		cardComponent.mount(cardNumberField);

		cardComponent.on('ready', function (event) {
			dispatch('ready', event);
		});
		cardComponent.on('focus', function (event) {
			dispatch('focus', event);
		});
		cardComponent.on('blur', function (event) {
			dispatch('blur', event);
		});
		cardComponent.on('invalid', function (event) {
			dispatch('invalid', event);
		});
		cardComponent.on('change', function (event) {
			dispatch('change', event);
		});
		cardComponent.on('empty', function (event) {
			dispatch('empty', event);
		});
		cardComponent.on('complete', function (event) {
			dispatch('complete', event);
		});
		cardComponent.on('click', function (event) {
			dispatch('click', event);
		});
		cardComponent.on('paymentrequested', function (event) {
			dispatch('paymentrequested', event);
		});
		cardComponent.on('loaderror', function (event) {
			dispatch('loaderror', event);
		});
	});
</script>

<div bind:this={cardNumberField}></div>
