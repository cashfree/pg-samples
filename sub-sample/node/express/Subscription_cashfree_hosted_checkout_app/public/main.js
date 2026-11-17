// DOM elements
const responseBox = document.getElementById("responseBox");
const curlOutput = document.getElementById("curlOutput");

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  const subscribeButtons = document.querySelectorAll(".subscribe-btn");
  subscribeButtons.forEach(button => {
    button.addEventListener("click", function() {
      const plan = this.getAttribute("data-plan");
      handleSubscription(plan);
    });
  });
});

// Handle subscription
async function handleSubscription(planType) {
  try {
    resetUI();

    // Create subscription and get session ID
    const sessionId = await createSubscription(planType);

    // Immediately trigger checkout using SDK
    triggerCheckout(sessionId);

  } catch (error) {
    handleError(error);
  }
}

// Reset UI elements
function resetUI() {
  if (responseBox) responseBox.textContent = "Creating subscription...";
  if (curlOutput) curlOutput.textContent = "";
}

// Create subscription via API
async function createSubscription(planType) {
  const planMappings = {
    standard: {
      plan_id: "Standard_Monthly_Plan",
      first_charge_date: getFutureDate(2),
      first_charge_time: "10:00:00"
    },
    premium: {
      plan_id: "Premium_Yearly_Plan",
      first_charge_date: getFutureDate(2),
      first_charge_time: "10:00:00"
    },
    basic: {
      plan_id: "Basic_Daily_Plan",
      first_charge_date: getFutureDate(1),
      first_charge_time: "10:00:00"
    }
  };

  const planDetails = planMappings[planType];
  if (!planDetails) throw new Error("Invalid plan type selected");

  const response = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: planDetails.plan_id,
      first_charge_date: planDetails.first_charge_date,
      first_charge_time: planDetails.first_charge_time
    })
  });

  const result = await response.json();

  if (responseBox) responseBox.textContent = JSON.stringify(result, null, 2);
  if (curlOutput && result.curl) curlOutput.textContent = result.curl;

  if (!response.ok) {
    throw new Error(result.message || "Subscription failed");
  }

  const sessionId = result.data?.subscription_session_id;
  if (!sessionId) {
    throw new Error("Subscription created but no session ID found!");
  }

  return sessionId;
}

// Trigger Cashfree checkout
function triggerCheckout(sessionId) {
  if (typeof cashfree === "undefined") {
    throw new Error("Cashfree SDK not loaded");
  }

  cashfree.subscriptionsCheckout({
    subsSessionId: sessionId,
    redirectTarget: "_blank"
  }).then(result => {
    if (result.error) {
      throw new Error(result.error.message || "Checkout error");
    }
  }).catch(handleError);
}

// Handle errors
function handleError(error) {
  console.error("Error:", error);
  if (responseBox) responseBox.textContent = `Error: ${error.message}`;
  alert(`Error: ${error.message}`);
}

// Helper to get date string T+X days in YYYY-MM-DD
function getFutureDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}
