const orderIdEl = document.getElementById("orderId");
const statusPillEl = document.getElementById("statusPill");
const statusLogEl = document.getElementById("statusLog");
const refreshBtn = document.getElementById("refreshBtn");
const homeBtn = document.getElementById("homeBtn");

const params = new URLSearchParams(window.location.search);
const orderId = params.get("order_id") || localStorage.getItem("latest_order_id");

if (orderId) {
  localStorage.setItem("latest_order_id", orderId);
}

orderIdEl.textContent = orderId || "Not found";

const setStatusPill = (statusText) => {
  statusPillEl.textContent = statusText || "UNKNOWN";
  if (statusText === "PAID") {
    statusPillEl.classList.remove("pending");
  } else {
    statusPillEl.classList.add("pending");
  }
};

const fetchStatus = async () => {
  if (!orderId) {
    statusLogEl.textContent = "order_id is missing in URL.";
    setStatusPill("UNKNOWN");
    return;
  }

  try {
    statusLogEl.textContent = "Fetching order status...";
    const response = await fetch(`/api/order-status/${encodeURIComponent(orderId)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to fetch order status");
    }

    setStatusPill(data.orderStatus);
    statusLogEl.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    setStatusPill("ERROR");
    statusLogEl.textContent = `Status fetch error: ${error.message || error}`;
  }
};

refreshBtn.addEventListener("click", fetchStatus);
homeBtn.addEventListener("click", () => {
  window.location.href = "/";
});

fetchStatus();
