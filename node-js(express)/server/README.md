cashfree-node-pg-demo/
│
├── server/
│ ├── create_order.js
│ ├── return_server.js
│ ├── index.html
│ ├── config.js
│ ├── package.json
│ ├── payment_session_data.json (auto)
│ ├── order_data.json (auto)
│ ├── .gitignore
│ ├── README.md
│
├── .env (NOT COMMITTED)


---

## 🔐 Environment Variables

Create a `.env` file (DO NOT upload it to GitHub):



ENVIRONMENT=Test

TEST_CLIENT_ID=your-test-client-id
TEST_CLIENT_SECRET=your-test-client-secret

PROD_CLIENT_ID=your-prod-client-id
PROD_CLIENT_SECRET=your-prod-client-secret


---

## 📦 Install Dependencies

Run:



npm install


---

## ▶️ Start the App



npm start


This runs:
- Order creation server: http://localhost:3001  
- Return URL server: http://localhost:3002  
- Checkout page served on `/`

---

## 💳 Payment Flow

1. App automatically creates the order on startup  
2. The session ID is stored locally  
3. User clicks **Pay Now** → Cashfree Checkout opens  
4. After payment, Cashfree redirects → `/return`  
5. Server polls Cashfree API → shows final status

---

## 🚫 Keys Are Never Exposed

- All secrets are stored in `.env`
- `.gitignore` prevents accidental upload

---

## ✔️ Requirements Before Running

- Node.js 16+
- Cashfree Test/Production credentials
- Internet connection (Cashfree endpoints must be reachable)

---

## 📚 Cashfree Docs Reference

https://www.cashfree.com/docs/api-reference/payments/latest/

---

## 👨‍💻 Author  
Rahul Raman — Cashfree PG Demo