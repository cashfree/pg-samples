const logEl = document.getElementById("log");
const payBtn = document.getElementById("payBtn");
const statusBtn = document.getElementById("statusBtn");

const log = (message, payload) => {
  const line = payload ? `${message}\n${JSON.stringify(payload, null, 2)}` : message;
  logEl.textContent = line;
};

let cashfreeSdkPromise;

const loadCashfreeSdk = (sdkPath = "/vendor/cashfree.js") => {
  if (typeof window.Cashfree === "function") {
    return Promise.resolve(window.Cashfree);
  }

  if (cashfreeSdkPromise) {
    return cashfreeSdkPromise;
  }

  cashfreeSdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-cashfree-sdk="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (typeof window.Cashfree === "function") {
          resolve(window.Cashfree);
        } else {
          reject(new Error("Cashfree SDK loaded but window.Cashfree is unavailable"));
        }
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load Cashfree SDK script"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = sdkPath;
    script.async = true;
    script.dataset.cashfreeSdk = "true";
    script.onload = () => {
      if (typeof window.Cashfree === "function") {
        resolve(window.Cashfree);
      } else {
        reject(new Error("Cashfree SDK loaded but window.Cashfree is unavailable"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK script"));
    document.head.appendChild(script);
  });

  return cashfreeSdkPromise;
};

const setCheckoutContextOnAndroid = (orderId, statusPageUrl) => {
  if (window.AndroidBridge && typeof window.AndroidBridge.setCheckoutContext === "function") {
    window.AndroidBridge.setCheckoutContext(orderId, statusPageUrl);
  }
};

const startPayment = async () => {
  try {
    payBtn.disabled = true;
    log("Creating order from backend...");

    const health = await fetch("/health");
    if (!health.ok) {
      throw new Error("Backend health check failed");
    }

    const configResponse = await fetch("/api/frontend-config");
    const config = await configResponse.json();

    const response = await fetch("/api/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ orderAmount: 1.0 })
    });

    const data = await response.json();
    if (!response.ok) {
      const backendMessage = data?.message || data?.error || "Unable to create order";
      const cashfreeMessage =
        data?.cashfree?.message || data?.cashfree?.type || data?.cashfree?.code || "";
      const finalMessage = cashfreeMessage
        ? `${backendMessage} | Cashfree: ${cashfreeMessage}`
        : backendMessage;
      throw new Error(finalMessage);
    }

    localStorage.setItem("latest_order_id", data.orderId);
    setCheckoutContextOnAndroid(data.orderId, data.statusPageUrl);

    log("Order created. Launching checkout...", data);

    const CashfreeSdk = await loadCashfreeSdk(config.cashfreeSdkPath || "/vendor/cashfree.js");
    const cashfree = CashfreeSdk({ mode: config.cashfreeMode || "sandbox" });
    await cashfree.checkout({
      paymentSessionId: data.paymentSessionId,
      redirectTarget: "_self"
    });
  } catch (error) {
    const message = error?.message || String(error);
    const isCredentialIssue = /credential|client_id|client_secret|missing credentials/i.test(message);
    const isSdkIssue = /cashfree sdk|window\.cashfree|failed to load cashfree sdk/i.test(message);
    const hint = isCredentialIssue
      ? "Check CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in server/.env."
      : isSdkIssue
        ? "Check local backend SDK proxy at /vendor/cashfree.js and keep only one backend running."
        : "Check backend availability on port 8090 and keep only one server process running.";
    log("Payment start failed.", { message, hint });
  } finally {
    payBtn.disabled = false;
  }
};

payBtn.addEventListener("click", startPayment);

statusBtn.addEventListener("click", () => {
  const orderId = localStorage.getItem("latest_order_id");
  if (!orderId) {
    log("No recent order found. Start a payment first.");
    return;
  }
  window.location.href = `/status.html?order_id=${encodeURIComponent(orderId)}`;
});
