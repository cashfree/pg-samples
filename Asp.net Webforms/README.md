# 🧾 **Cashfree Payment Gateway – ASP.NET WebForms Sample**

This repository demonstrates a **complete synchronous payment flow** using the Cashfree Payment Gateway v3, implemented in **ASP.NET WebForms (.aspx + C# code-behind)**.

The sample shows:

1. Creating an order on the server
2. Returning the `payment_session_id` to the frontend
3. Launching Cashfree Checkout via JS SDK
4. Redirecting to a Return URL
5. Fetching real-time payment status from Cashfree
6. Displaying Success / Pending / Failure on UI

This sample mirrors the overall structure of the official Cashfree PG samples (e.g. Go/Echo), but adapted to ASP.NET WebForms.

---

# 📌 **Project Structure**

```
/cashfree
│── Default.aspx               # Frontend page to trigger order creation
│── Default.aspx.cs           # Backend order creation (WebMethod) — creates order & returns session ID
│── Return.aspx               # Landing page after payment (Return URL)
└── Return.aspx.cs            # Fetches payment status from Cashfree and shows result to user
```

---

# 🚀 **1. Create Order (Server-Side)**

The frontend calls the backend using an AJAX WebMethod:

### **Endpoint**

```
POST /cashfree/Default.aspx/CreateOrder
```

### **Responsibility**

* Generates a new `order_id`
* Calls **Create Order API** (`POST /pg/orders`)
* Extracts `payment_session_id`
* Returns JSON to the browser

📝 **Location:** `Default.aspx.cs` → `CreateOrder()`


---

### **Sample Response (returned to frontend)**

```json
{
  "raw": { ...full response from Cashfree... },
  "payment_session_id": "session_xyz",
  "order_id": "order_abcd1234"
}
```

---

# 🧩 **2. Launch Cashfree Checkout (Frontend)**

Once the AJAX call receives `payment_session_id`, the browser triggers:

```javascript
cashfree.checkout({
  paymentSessionId: session_id,
  redirectTarget: "_self"
});
```

This loads Cashfree’s hosted checkout page.

---

# 🔁 **3. Return URL (Post Payment)**

After payment completion (success/pending/failed), Cashfree redirects to:

```
https://yourdomain.com/cashfree/return.aspx?order_id=<order_id>
```

📝 **Location:** `Return.aspx.cs`


---

# 🔍 **4. Get Payment Status (Server-Side)**

Inside the Return URL handler, the server calls:

```
GET /pg/orders/{order_id}/payments
```

with headers:

```http
x-api-version: 2025-01-01
x-client-id: <your-test-client-id>
x-client-secret: <your-test-secret>
```

The response may return either:

### Array response

```json
[
  {
    "payment_status": "SUCCESS",
    "cf_payment_id": "123456",
    "payment_message": "...",
    "payment_gateway_details": { ... }
  }
]
```

### Or object-with-array structure

```json
{
  "payments": [
    { ... }
  ]
}
```

Your implementation handles **all response shapes** gracefully.

---

# 🎯 **5. Status Mapping Logic**

Based on the JSON structure, the following rules apply:

| Payment Status Returned                    | UI Output   |
| ------------------------------------------ | ----------- |
| `"SUCCESS"`                                | **Success** |
| `"PENDING"`, `"INITIATED"`, `"PROCESSING"` | **Pending** |
| Anything else / No payments                | **Failure** |

✔ This mapping is implemented in:
`Return.aspx.cs → GetOrderStatusDetailed()`


---

# 🧪 **6. Test the Flow**

### Step 1 — Open the Create Order Page

```
https://yourdomain.com/cashfree/default.aspx
```

### Step 2 — Click **Pay Now** (your frontend code launches Checkout)

### Step 3 — Complete payment on Cashfree Checkout

### Step 4 — You are redirected to Return URL

Example:

```
https://yourdomain.com/cashfree/return.aspx?order_id=order_xyz
```

### Step 5 — Server fetches payment status and shows:

```
Order Status: Success (cf_payment_id: 5114923469367; message: <...>; gateway_payment_id: 5114923469367)
```

Debug JSON is also printed neatly formatted.

---

# 🛡 **7. Security Notes**

* Never expose `client-secret` on the frontend
* Always create orders **server side**
* Ensure Return URL is HTTPS
* Validate `order_id` before making status calls
* Always HTML-encode user inputs (already done in your code)

---

# 📦 **8. Switch to Production**

Replace:

```
https://sandbox.cashfree.com
```

with:

```
https://api.cashfree.com
```

And set **production**:

```
x-client-id
x-client-secret
```

Ensure your domain is added in **Cashfree Dashboard → Allowed Domains**.

---

# 🎉 **9. What This Sample Demonstrates**

| Feature                               | Implemented |
| ------------------------------------- | ----------- |
| Create Order API                      | ✅           |
| Extract `payment_session_id`          | ✅           |
| Cashfree JS Checkout                  | ✅           |
| Return URL handling                   | ✅           |
| Real-time payment status lookup       | ✅           |
| Robust JSON parsing (array/object)    | ✅           |
| UI output for success/pending/failure | ✅           |

Your ASP.NET WebForms implementation is now fully in line with Cashfree’s recommended flow.

---

# 📚 **10. References**

Your code files used for this README:

* **Default.aspx.cs – Order Creation**

* **Return.aspx.cs – Payment Status Verification**



