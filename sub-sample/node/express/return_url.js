const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// In-memory storage
const subscriptionResponses = [];

router.post("/return-url", (req, res) => {
  const data = req.body;
  const now = new Date();
  
  // Store response with verification details
  const storedResponse = {
    timestamp: now.toISOString(),
    data: {...data},
    signatureValid: false,
    computedSignature: '',
    dataString: ''
  };

  // Signature verification
  if (data.signature) {
    try {
      // 1. Extract and remove signature
      const verificationData = {...data};
      const receivedSignature = verificationData.signature;
      delete verificationData.signature;

      // 2. Sort parameters alphabetically
      const sortedKeys = Object.keys(verificationData).sort();
      
      // 3. Concatenate key-value pairs
      const dataString = sortedKeys.map(key => key + String(verificationData[key])).join('');
      storedResponse.dataString = dataString;
      
      // 4. Compute HMAC-SHA256
      const secret = process.env.CASHFREE_SECRET;
      const computedSignature = crypto.createHmac('sha256', secret)
                                     .update(dataString, 'utf8')
                                     .digest('base64');
      
      storedResponse.computedSignature = computedSignature;
      
      // 5. Compare signatures
      storedResponse.signatureValid = (receivedSignature === computedSignature);
      
    } catch (error) {
      console.error("Signature verification failed:", error);
      storedResponse.signatureValid = false;
      storedResponse.error = error.message;
    }
  }
  
  // Store the response
  subscriptionResponses.push(storedResponse);
  
  // Generate HTML response
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Subscription Response</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        body {
          background-color: #f5f7fa;
          color: #333;
          line-height: 1.6;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        header {
          background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
          color: white;
          padding: 25px 30px;
          text-align: center;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }
        .timestamp {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 8px;
        }
        .section {
          padding: 25px 30px;
          border-bottom: 1px solid #eaeaea;
        }
        h2 {
          font-size: 22px;
          color: #2c3e50;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f0f0f0;
        }
        .responsive-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .responsive-table th {
          background-color: #f8f9fa;
          text-align: left;
          padding: 15px;
          font-weight: 600;
          border-bottom: 2px solid #e0e0e0;
        }
        .responsive-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        .responsive-table tr:last-child td {
          border-bottom: none;
        }
        .signature-valid {
          color: #28a745;
          font-weight: bold;
          font-size: 18px;
        }
        .signature-invalid {
          color: #dc3545;
          font-weight: bold;
          font-size: 18px;
        }
        pre {
          background: #2d3748;
          color: #e2e8f0;
          padding: 15px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 14px;
          margin: 10px 0;
          max-height: 300px;
          overflow-y: auto;
        }
        .code-block {
          font-family: 'Courier New', monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.05);
        }
        .storage-info {
          background: #e8f4ff;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin-top: 20px;
          font-size: 16px;
        }
        @media (max-width: 768px) {
          .section {
            padding: 15px;
          }
          .responsive-table th, 
          .responsive-table td {
            padding: 10px;
            font-size: 14px;
          }
          h1 {
            font-size: 24px;
          }
          h2 {
            font-size: 20px;
          }
        }
        @media (max-width: 480px) {
          .responsive-table {
            display: block;
            overflow-x: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>Subscription Payment Response</h1>
          <div class="timestamp">Received at: ${storedResponse.timestamp}</div>
        </header>
        
        <div class="section">
          <h2>Response Data</h2>
          <table class="responsive-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data).map(([key, val]) => `
                <tr>
                  <td><strong>${key}</strong></td>
                  <td class="code-block">${val}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        ${data.signature ? `
          <div class="section">
            <h2>Signature Verification</h2>
            <div class="grid-container">
              <div class="card">
                <h3>Received Signature</h3>
                <pre>${data.signature}</pre>
              </div>
              
              <div class="card">
                <h3>Computed Signature</h3>
                <pre>${storedResponse.computedSignature}</pre>
              </div>
              
              <div class="card">
                <h3>Validation Status</h3>
                <p class="${storedResponse.signatureValid ? 'signature-valid' : 'signature-invalid'}">
                  ${storedResponse.signatureValid ? 'VALID' : 'INVALID'}
                </p>
              </div>
            </div>
            
            <div class="card">
              <h3>Data String for HMAC</h3>
              <pre>${storedResponse.dataString}</pre>
            </div>
          </div>
        ` : ''}
        
        <div class="section">
          <div class="storage-info">
            Total stored responses: <strong>${subscriptionResponses.length}</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Add route to view all responses
router.get("/responses", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>All Subscription Responses</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* Reuse styles from above with minor adjustments */
        body {
          background-color: #f5f7fa;
          color: #333;
          line-height: 1.6;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          overflow: hidden;
          padding: 25px;
        }
        h1 {
          text-align: center;
          margin-bottom: 25px;
          color: #2c3e50;
        }
        .responsive-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .responsive-table th {
          background-color: #4b6cb7;
          color: white;
          text-align: left;
          padding: 15px;
          font-weight: 600;
        }
        .responsive-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        .signature-valid { color: #28a745; }
        .signature-invalid { color: #dc3545; }
        @media (max-width: 768px) {
          .responsive-table {
            display: block;
            overflow-x: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Stored Subscription Responses (${subscriptionResponses.length})</h1>
        <table class="responsive-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Subscription ID</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Signature Valid</th>
            </tr>
          </thead>
          <tbody>
            ${subscriptionResponses.map(response => `
              <tr>
                <td>${response.timestamp}</td>
                <td>${response.data.cf_subscriptionId || 'N/A'}</td>
                <td>${response.data.cf_status || 'N/A'}</td>
                <td>${response.data.cf_authAmount || 'N/A'}</td>
                <td class="${response.signatureValid ? 'signature-valid' : 'signature-invalid'}">
                  ${response.signatureValid !== null ? (response.signatureValid ? 'Yes' : 'No') : 'N/A'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

module.exports = router;