<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Cashfree Sveltekit sample app</title>
</svelte:head>
<header
	class="sticky inset-x-0 top-4 z-50 flex w-full flex-wrap before:absolute before:inset-0 before:mx-2 before:max-w-5xl before:rounded-full before:bg-indigo-500 before:backdrop-blur-md md:flex-nowrap md:justify-start lg:before:mx-auto"
>
	<nav
		class="relative mx-2 w-full max-w-5xl py-2.5 ps-5 pe-2 md:flex md:items-center md:justify-between md:py-0 lg:mx-auto"
	>
		<div class="flex items-center justify-between py-4">
			<div class="flex items-center">
				<!-- Logo -->
				<a
					class="inline-block flex-none rounded-md text-xl font-semibold focus:opacity-80 focus:outline-hidden"
					href="../templates/agency/index.html"
					aria-label="Preline"
				>
					<img
						src="https://cashfreelogo.cashfree.com/cashfreepayments/logopng4x/Cashfree_Payments_Logo-3.png"
						class="h-6"
						alt=""
						srcset=""
					/>
				</a>
				<!-- End Logo -->

				<div class="ms-1 sm:ms-2"></div>
			</div>
		</div>
		<div>
			<!-- Collapse -->
			<div
				id="hs-navbar-floating-dark"
				class="hs-collapse hidden grow basis-full overflow-hidden transition-all duration-300 md:block"
				aria-labelledby="hs-navbar-floating-dark-collapse"
			>
				<div>
					<a
						class="group inline-flex items-center gap-x-2 rounded-full bg-[#ff0] px-3 py-2 text-sm font-medium text-neutral-800 focus:outline-hidden"
						href="https://cashfree.com/devstudio"
					>
						Contact us
					</a>
				</div>
			</div>
		</div>
		<!-- End Collapse -->
	</nav>
</header>

{@render children()}
