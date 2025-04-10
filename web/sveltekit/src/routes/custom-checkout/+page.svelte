<script>
	import { load } from '@cashfreepayments/cashfree-js';
	import { onMount } from 'svelte';
	import CardNumber from '$lib/cashfree/CardNumber.svelte';
	import CardExpiry from '$lib/cashfree/CardExpiry.svelte';
	import CardCVV from '$lib/cashfree/CardCVV.svelte';
	import CardHolder from '$lib/cashfree/CardHolder.svelte';

	let cardNumberField;
	let cardExpiryField;
	let cashfree;

	let styleOptions = {
		styles: {
			base: {
				color: '#000',
				fontSize: '16px',
				fontFamily: 'Arial, sans-serif',
				'::placeholder': {
					color: '#aab7c4'
				}
			},
			invalid: {
				color: '#fa755a',
				iconColor: '#fa755a'
			},
			focus: {
				outline: 'none'
			}
		}
	};

	onMount(async function () {
		cashfree = await load({
			mode: 'sandbox'
		});
	});

	function formChange(event) {
		console.log('Card Number Change Event:', event);
	}
</script>

<section class="relative mt-10">
	<div class="mx-auto grid max-w-4xl grid-cols-2 gap-4 rounded-md shadow-lg ring-4 ring-blue-100">
		<div class="col-span1 p-4">1</div>
		<div class="col-span1 flex flex-col justify-center gap-y-2 bg-blue-50 p-4">
			{#if !!cashfree}
				<div class="rounded-md border border-gray-400 p-2">
					<CardNumber {cardNumberField} {cashfree} {styleOptions} on:change={formChange} />
				</div>
				<div class="flex flex-row gap-x-4">
					<div class="w-[80px] rounded-md border border-gray-400 p-2">
						<CardExpiry {cashfree} {styleOptions} />
					</div>
					<div class="w-[80px] rounded-md border border-gray-400 p-2">
						<CardCVV {cashfree} {styleOptions} />
					</div>
				</div>
				<div class="rounded-md border border-gray-400 p-2">
					<CardHolder {cashfree} {styleOptions} />
				</div>
				<div>
					<button
						class=" w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
						on:click={() => {
							cashfree
								.create('cardNumber')
								.getCardDetails()
								.then((details) => {
									console.log(details);
								});
						}}
					>
						Pay Now
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
