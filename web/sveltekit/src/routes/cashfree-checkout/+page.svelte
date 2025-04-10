<!-- ========== HEADER ========== -->
<script>
	import { load } from '@cashfreepayments/cashfree-js';
	import { onMount } from 'svelte';
	let minAmount = '100';
	let quantity = 1;
	let size = 'S';

	function increment() {
		quantity++;
	}

	function decrement() {
		if (quantity > 1) {
			quantity--;
		}
	}

	let cashfree;

	onMount(async function () {
		cashfree = await load({
			mode: 'sandbox'
		});
	});

	let errorMessage = '';
	let orderID;

	let callingAPI = false;

	//make an api call to http://localhost:3000/api/checkout
	//pass the minAmount, quantity, size
	//get the response and redirect to the checkout page
	//use the below code to redirect to the checkout page
	async function redirectToCheckout() {
		const url = 'http://localhost:5173/api/order';
		const options = {
			method: 'POST',
			body: JSON.stringify({ order_amount: minAmount * quantity })
		};
		callingAPI = true;
		try {
			const response = await fetch(url, options);
			const data = await response.json();
			orderID = data.order_id;
			cashfree
				.checkout({
					paymentSessionId: data.payment_session_id,
					redirectTarget: '_modal'
				})
				.then(async function (data) {
					if (!!data.error) {
						return setTimeout(() => {
							alert(data.error.message);
						}, 1000);
					}

					if (data.paymentDetails) {
						// This will be called whenever the payment is completed irrespective of transaction status
						const url = 'http://localhost:5173/api/order?order_id=' + orderID;
						const options = { method: 'GET' };

						try {
							const response = await fetch(url, options);
							const data = await response.json();
							if (data.order_status == 'PAID') {
								alert('Payment successful\n' + JSON.stringify(data, null, 2));
							} else {
								alert('Payment failed');
							}
						} catch (error) {
							console.error(error);
							alert('Something is not right');
						}
					} else {
						return setTimeout(() => {
							alert('Something is not right');
						}, 1000);
					}
				});
		} catch (error) {
			console.error(error);
		} finally {
			callingAPI = false;
		}
	}
</script>

<!-- ========== END HEADER ========== -->
<section class="relative mt-10">
	<div class="mx-auto w-full px-4 sm:px-6 lg:px-0">
		<div class="mx-auto grid grid-cols-1 gap-16 max-md:px-2 lg:grid-cols-2">
			<div class="img">
				<div class="img-box h-full max-lg:mx-auto">
					<img
						src="https://pagedone.io/asset/uploads/1700471600.png"
						alt="Yellow Tropical Printed Shirt image"
						class="h-full object-cover max-lg:mx-auto lg:ml-auto"
					/>
				</div>
			</div>
			<div
				class="data my-0 flex w-full items-center justify-center pr-0 max-lg:pb-10 lg:my-5 lg:pr-8 xl:my-2 xl:justify-start"
			>
				<div class="data w-full max-w-xl">
					<p class="mb-4 text-lg leading-8 font-medium text-indigo-600">
						Clothing&nbsp; /&nbsp; Menswear
					</p>
					<h2 class="font-manrope mb-2 text-3xl leading-10 font-bold text-gray-900 capitalize">
						Basic Yellow Tropical Printed Shirt
					</h2>
					<div class="mb-6 flex flex-col sm:flex-row sm:items-center">
						<h6
							class="font-manrope mr-5 border-gray-200 pr-5 text-2xl leading-9 font-semibold text-gray-900 sm:border-r"
						>
							₹{minAmount * quantity}
						</h6>
						<div class="flex items-center gap-2">
							<div class="flex items-center gap-1">
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<g clip-path="url(#clip0_12029_1640)">
										<path
											d="M9.10326 2.31699C9.47008 1.57374 10.5299 1.57374 10.8967 2.31699L12.7063 5.98347C12.8519 6.27862 13.1335 6.48319 13.4592 6.53051L17.5054 7.11846C18.3256 7.23765 18.6531 8.24562 18.0596 8.82416L15.1318 11.6781C14.8961 11.9079 14.7885 12.2389 14.8442 12.5632L15.5353 16.5931C15.6754 17.41 14.818 18.033 14.0844 17.6473L10.4653 15.7446C10.174 15.5915 9.82598 15.5915 9.53466 15.7446L5.91562 17.6473C5.18199 18.033 4.32456 17.41 4.46467 16.5931L5.15585 12.5632C5.21148 12.2389 5.10393 11.9079 4.86825 11.6781L1.94038 8.82416C1.34687 8.24562 1.67438 7.23765 2.4946 7.11846L6.54081 6.53051C6.86652 6.48319 7.14808 6.27862 7.29374 5.98347L9.10326 2.31699Z"
											fill="#FBBF24"
										/>
									</g>
									<defs>
										<clipPath id="clip0_12029_1640">
											<rect width="20" height="20" fill="white" />
										</clipPath>
									</defs>
								</svg>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<g clip-path="url(#clip0_12029_1640)">
										<path
											d="M9.10326 2.31699C9.47008 1.57374 10.5299 1.57374 10.8967 2.31699L12.7063 5.98347C12.8519 6.27862 13.1335 6.48319 13.4592 6.53051L17.5054 7.11846C18.3256 7.23765 18.6531 8.24562 18.0596 8.82416L15.1318 11.6781C14.8961 11.9079 14.7885 12.2389 14.8442 12.5632L15.5353 16.5931C15.6754 17.41 14.818 18.033 14.0844 17.6473L10.4653 15.7446C10.174 15.5915 9.82598 15.5915 9.53466 15.7446L5.91562 17.6473C5.18199 18.033 4.32456 17.41 4.46467 16.5931L5.15585 12.5632C5.21148 12.2389 5.10393 11.9079 4.86825 11.6781L1.94038 8.82416C1.34687 8.24562 1.67438 7.23765 2.4946 7.11846L6.54081 6.53051C6.86652 6.48319 7.14808 6.27862 7.29374 5.98347L9.10326 2.31699Z"
											fill="#FBBF24"
										/>
									</g>
									<defs>
										<clipPath id="clip0_12029_1640">
											<rect width="20" height="20" fill="white" />
										</clipPath>
									</defs>
								</svg>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<g clip-path="url(#clip0_12029_1640)">
										<path
											d="M9.10326 2.31699C9.47008 1.57374 10.5299 1.57374 10.8967 2.31699L12.7063 5.98347C12.8519 6.27862 13.1335 6.48319 13.4592 6.53051L17.5054 7.11846C18.3256 7.23765 18.6531 8.24562 18.0596 8.82416L15.1318 11.6781C14.8961 11.9079 14.7885 12.2389 14.8442 12.5632L15.5353 16.5931C15.6754 17.41 14.818 18.033 14.0844 17.6473L10.4653 15.7446C10.174 15.5915 9.82598 15.5915 9.53466 15.7446L5.91562 17.6473C5.18199 18.033 4.32456 17.41 4.46467 16.5931L5.15585 12.5632C5.21148 12.2389 5.10393 11.9079 4.86825 11.6781L1.94038 8.82416C1.34687 8.24562 1.67438 7.23765 2.4946 7.11846L6.54081 6.53051C6.86652 6.48319 7.14808 6.27862 7.29374 5.98347L9.10326 2.31699Z"
											fill="#FBBF24"
										/>
									</g>
									<defs>
										<clipPath id="clip0_12029_1640">
											<rect width="20" height="20" fill="white" />
										</clipPath>
									</defs>
								</svg>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<g clip-path="url(#clip0_12029_1640)">
										<path
											d="M9.10326 2.31699C9.47008 1.57374 10.5299 1.57374 10.8967 2.31699L12.7063 5.98347C12.8519 6.27862 13.1335 6.48319 13.4592 6.53051L17.5054 7.11846C18.3256 7.23765 18.6531 8.24562 18.0596 8.82416L15.1318 11.6781C14.8961 11.9079 14.7885 12.2389 14.8442 12.5632L15.5353 16.5931C15.6754 17.41 14.818 18.033 14.0844 17.6473L10.4653 15.7446C10.174 15.5915 9.82598 15.5915 9.53466 15.7446L5.91562 17.6473C5.18199 18.033 4.32456 17.41 4.46467 16.5931L5.15585 12.5632C5.21148 12.2389 5.10393 11.9079 4.86825 11.6781L1.94038 8.82416C1.34687 8.24562 1.67438 7.23765 2.4946 7.11846L6.54081 6.53051C6.86652 6.48319 7.14808 6.27862 7.29374 5.98347L9.10326 2.31699Z"
											fill="#FBBF24"
										/>
									</g>
									<defs>
										<clipPath id="clip0_12029_1640">
											<rect width="20" height="20" fill="white" />
										</clipPath>
									</defs>
								</svg>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<g clip-path="url(#clip0_8480_66029)">
										<path
											d="M9.10326 2.31699C9.47008 1.57374 10.5299 1.57374 10.8967 2.31699L12.7063 5.98347C12.8519 6.27862 13.1335 6.48319 13.4592 6.53051L17.5054 7.11846C18.3256 7.23765 18.6531 8.24562 18.0596 8.82416L15.1318 11.6781C14.8961 11.9079 14.7885 12.2389 14.8442 12.5632L15.5353 16.5931C15.6754 17.41 14.818 18.033 14.0844 17.6473L10.4653 15.7446C10.174 15.5915 9.82598 15.5915 9.53466 15.7446L5.91562 17.6473C5.18199 18.033 4.32456 17.41 4.46467 16.5931L5.15585 12.5632C5.21148 12.2389 5.10393 11.9079 4.86825 11.6781L1.94038 8.82416C1.34687 8.24562 1.67438 7.23765 2.4946 7.11846L6.54081 6.53051C6.86652 6.48319 7.14808 6.27862 7.29374 5.98347L9.10326 2.31699Z"
											fill="#F3F4F6"
										/>
									</g>
									<defs>
										<clipPath id="clip0_8480_66029">
											<rect width="20" height="20" fill="white" />
										</clipPath>
									</defs>
								</svg>
							</div>
							<span class="pl-2 text-sm leading-7 font-normal text-gray-500">1624 review</span>
						</div>
					</div>
					<p class="mb-5 text-base font-normal text-gray-500">
						Introducing our vibrant Basic Yellow Tropical Printed Shirt - a celebration of style and
						sunshine! Embrace the essence of summer wherever you go with this eye-catching piece
						that effortlessly blends comfort and tropical flair. <a href="#" class="text-indigo-600"
							>More....</a
						>
					</p>
					<ul class="mb-8 grid gap-y-4">
						<li class="flex items-center gap-3">
							<svg
								width="26"
								height="26"
								viewBox="0 0 26 26"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect width="26" height="26" rx="13" fill="#4F46E5" />
								<path
									d="M7.66669 12.629L10.4289 15.3913C10.8734 15.8357 11.0956 16.0579 11.3718 16.0579C11.6479 16.0579 11.8701 15.8357 12.3146 15.3913L18.334 9.37183"
									stroke="white"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
							<span class="text-base font-normal text-gray-900">Branded shirt</span>
						</li>
						<li class="flex items-center gap-3">
							<svg
								width="26"
								height="26"
								viewBox="0 0 26 26"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect width="26" height="26" rx="13" fill="#4F46E5" />
								<path
									d="M7.66669 12.629L10.4289 15.3913C10.8734 15.8357 11.0956 16.0579 11.3718 16.0579C11.6479 16.0579 11.8701 15.8357 12.3146 15.3913L18.334 9.37183"
									stroke="white"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
							<span class="text-base font-normal text-gray-900">3 color shirt</span>
						</li>
						<li class="flex items-center gap-3">
							<svg
								width="26"
								height="26"
								viewBox="0 0 26 26"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect width="26" height="26" rx="13" fill="#4F46E5" />
								<path
									d="M7.66669 12.629L10.4289 15.3913C10.8734 15.8357 11.0956 16.0579 11.3718 16.0579C11.6479 16.0579 11.8701 15.8357 12.3146 15.3913L18.334 9.37183"
									stroke="white"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
							<span class="text-base font-normal text-gray-900"
								>Pure Cotton Shirt with 60% as 40%</span
							>
						</li>
						<li class="flex items-center gap-3">
							<svg
								width="26"
								height="26"
								viewBox="0 0 26 26"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect width="26" height="26" rx="13" fill="#4F46E5" />
								<path
									d="M7.66669 12.629L10.4289 15.3913C10.8734 15.8357 11.0956 16.0579 11.3718 16.0579C11.6479 16.0579 11.8701 15.8357 12.3146 15.3913L18.334 9.37183"
									stroke="white"
									stroke-width="1.6"
									stroke-linecap="round"
								/>
							</svg>
							<span class="text-base font-normal text-gray-900">all size is available</span>
						</li>
					</ul>
					<p class="mb-4 text-lg leading-8 font-medium text-gray-900">Size</p>
					<div class="w-full flex-wrap border-b border-gray-100 pb-8">
						<div class="grid max-w-md grid-cols-3 gap-3 min-[400px]:grid-cols-5">
							<button
								on:click={() => (size = 'S')}
								class="flex w-full items-center justify-center rounded-full border border-gray-200 {size ==
								'S'
									? 'bg-blue-500 text-white'
									: 'bg-white'} cursor-pointer px-6 py-1.5 text-center text-lg leading-8 font-semibold text-gray-900 transition-all duration-300 visited:border-gray-300 visited:bg-gray-50"
								>S</button
							>
							<button
								on:click={() => (size = 'M')}
								class="flex w-full {size == 'M'
									? 'bg-blue-500 text-white'
									: 'bg-white'} cursor-pointer items-center justify-center rounded-full border border-gray-200 px-6 py-1.5 text-center text-lg leading-8 font-semibold text-gray-900 transition-all duration-300 visited:border-gray-300 visited:bg-gray-50"
								>M</button
							>
							<button
								on:click={() => (size = 'L')}
								class="flex w-full {size == 'L'
									? 'bg-blue-500 text-white'
									: 'bg-white'} items-center justify-center rounded-full border border-gray-200 px-6 py-1.5 text-center text-lg leading-8 font-semibold text-gray-900 transition-all duration-300 visited:border-gray-300 visited:bg-gray-50"
								>L</button
							>
							<button
								on:click={() => (size = 'XL')}
								class="flex w-full {size == 'XL'
									? 'bg-blue-500 text-white'
									: 'bg-white'} items-center justify-center rounded-full border border-gray-200 px-6 py-1.5 text-center text-lg leading-8 font-semibold text-gray-900 transition-all duration-300 visited:border-gray-300 visited:bg-gray-50"
								>XL</button
							>
							<button
								on:click={() => (size = 'XXL')}
								class="flex w-full {size == 'XXL'
									? 'bg-blue-500 text-white'
									: 'bg-white'} items-center justify-center rounded-full border border-gray-200 px-6 py-1.5 text-center text-lg leading-8 font-semibold text-gray-900 transition-all duration-300 visited:border-gray-300 visited:bg-gray-50"
								>XXL</button
							>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-3 py-8 sm:grid-cols-2">
						<div class="flex w-full sm:items-center sm:justify-center">
							<button
								on:click={decrement}
								class="group rounded-l-full border border-gray-400 bg-white px-6 py-4 transition-all duration-300 hover:bg-gray-50 hover:shadow-sm hover:shadow-gray-300"
							>
								<svg
									class="stroke-gray-900 group-hover:stroke-black"
									width="22"
									height="22"
									viewBox="0 0 22 22"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path d="M16.5 11H5.5" stroke="" stroke-width="1.6" stroke-linecap="round" />
									<path
										d="M16.5 11H5.5"
										stroke=""
										stroke-opacity="0.2"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
									<path
										d="M16.5 11H5.5"
										stroke=""
										stroke-opacity="0.2"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
								</svg>
							</button>
							<input
								type="text"
								bind:value={quantity}
								class="w-full cursor-pointer border-y border-gray-400 bg-transparent px-6 py-[13px] text-center text-lg font-semibold text-gray-900 outline-0 placeholder:text-gray-900 hover:bg-gray-50 sm:max-w-[118px]"
								placeholder="1"
							/>
							<button
								on:click={increment}
								class="group rounded-r-full border border-gray-400 bg-white px-6 py-4 transition-all duration-300 hover:bg-gray-50 hover:shadow-sm hover:shadow-gray-300"
							>
								<svg
									class="stroke-gray-900 group-hover:stroke-black"
									width="22"
									height="22"
									viewBox="0 0 22 22"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M11 5.5V16.5M16.5 11H5.5"
										stroke="#9CA3AF"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
									<path
										d="M11 5.5V16.5M16.5 11H5.5"
										stroke="black"
										stroke-opacity="0.2"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
									<path
										d="M11 5.5V16.5M16.5 11H5.5"
										stroke="black"
										stroke-opacity="0.2"
										stroke-width="1.6"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<button
							class="group rounded-full bg-indigo-50 p-4 transition-all duration-500 hover:bg-indigo-100 hover:shadow-sm hover:shadow-indigo-300"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="26"
								height="26"
								viewBox="0 0 26 26"
								fill="none"
							>
								<path
									d="M4.47084 14.3196L13.0281 22.7501L21.9599 13.9506M13.0034 5.07888C15.4786 2.64037 19.5008 2.64037 21.976 5.07888C24.4511 7.5254 24.4511 11.4799 21.9841 13.9265M12.9956 5.07888C10.5204 2.64037 6.49824 2.64037 4.02307 5.07888C1.54789 7.51738 1.54789 11.4799 4.02307 13.9184M4.02307 13.9184L4.04407 13.939M4.02307 13.9184L4.46274 14.3115"
									stroke="#4F46E5"
									stroke-width="1.6"
									stroke-miterlimit="10"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
						<button
							disabled={callingAPI}
							on:click={redirectToCheckout}
							class="flex w-full items-center justify-center rounded-[100px] bg-indigo-600 px-5 py-4 text-center text-lg font-semibold text-white shadow-sm transition-all duration-500 hover:bg-indigo-700 hover:shadow-indigo-400 disabled:opacity-30"
						>
							Buy Now
							{#if callingAPI}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="lucide lucide-loader-icon lucide-loader ml-2 animate-spin"
									><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path
										d="m16.2 16.2 2.9 2.9"
									/><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path
										d="m4.9 4.9 2.9 2.9"
									/></svg
								>
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
