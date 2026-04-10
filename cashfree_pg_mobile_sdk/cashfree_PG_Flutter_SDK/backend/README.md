# Cashfree Flutter PG App Backend

This backend server handles order creation for the Cashfree Flutter app.

## Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on http://localhost:3000.

## API

### POST /create-order

Creates an order via Cashfree API.

**Request Body:**
```json
{
  "order_id": "order_123456"
}
```

**Response:**
```json
{
  "order_id": "order_123456",
  "payment_session_id": "session_abc123"
}
```

## Configuration

Edit `config.json` to update API credentials and environment.

Note: In production, move credentials to environment variables for security.