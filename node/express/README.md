# Express Cashfree Payment Sample

This sample app demonstrates how to collect payments using the Cashfree JavaScript and Node.js SDKs with a popup checkout. It is built using HTML for frontend and express js for backend.

## Prerequisites

- Node.js (v14 or later)
- npm

## Setup

1. **Clone the repository and navigate to the project folder:**

   ```bash
   git clone https://github.com/cashfree/pg-samples.git
   cd node/express
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Configuration

**Environment Variables:**

   Create & Open the .env file and set the following environment variables with your Cashfree credentials:

   ```
   APP_ID=your_cashfree_app_id
   SECRET_KEY=your_cashfree_secret_key
   ```

## Running the App

   Use the following command to start the development server:

   ```bash
   node server
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).