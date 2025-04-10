<template>
  <button
                                    class="flex w-full items-center justify-center rounded-[100px] bg-indigo-600 px-5 py-4 text-center text-lg font-semibold text-white shadow-sm transition-all duration-500 hover:bg-indigo-700 hover:shadow-indigo-400 disabled:opacity-30 cursor-pointer"
                                    id="payNow"
                                    @click="handleClick"
                                >
                                    Buy Now
                                </button>
</template>

<script setup>

var order_id = "";

const initiateCheckout = (payment_session_id) => {
    const cashfree = Cashfree({
        mode: "sandbox", // Use "production" for live environment
    });

    let checkoutOptions = {
        paymentSessionId: payment_session_id, // Replace with your actual payment session ID
        redirectTarget: "_modal", // Opens the checkout in a pop-up
    };

    cashfree.checkout(checkoutOptions).then((result) => {
        if (result.error) {
            console.log("Error during payment:", result.error);
        }
        if (result.redirect) {
            console.log("Payment will be redirected.");
        }
        if (result.paymentDetails) {
            fetchOrder();
        }
    });
};

async function fetchOrder() {
  try {
    const response = await $fetch('/api/verifyPayment', {
      method: 'POST',
      body: {
        order_id: order_id,
      }
    })

    const h1 = document.getElementById("payNow");
    h1.innerHTML = response.order_status === 'PAID' ? 'Payment Successful' : 'Payment Failed';

  } catch (error) {
    console.error('Payment error:', error)
    alert('Payment failed.')
  }
}

async function handleClick() {
  try {
    const response = await $fetch('/api/payment', {
      method: 'POST',
      body: {
        amount: 100,
        currency: 'INR'
      }
    })

    order_id = response.order_id;
    initiateCheckout(response.payment_session_id);

  } catch (error) {
    console.error('Payment error:', error)
    alert('Payment failed.')
  }
}

</script>
