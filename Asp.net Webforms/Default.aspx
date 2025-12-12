<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Default.aspx.cs" Inherits="cashfree_Default" %>

<!DOCTYPE html>
<html lang="en">
<head runat="server">
    <meta charset="UTF-8" />
    <title>Cashfree Checkout Integration</title>

    <!-- Cashfree JS SDK v3 -->
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>

    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
        }

        .row {
            margin-bottom: 15px;
        }

        #output {
            white-space: pre-wrap;
            background: #f4f4f4;
            border: 1px solid #ccc;
            padding: 12px;
            margin-top: 15px;
            min-height: 80px;
        }

        button {
            padding: 8px 16px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="row">
            <p>Click below to open the checkout page in current tab</p>
            <button type="button" id="renderBtn">Pay Now</button>
        </div>

        <h3>Create Order API Output</h3>
        <div id="output">Click "Pay Now" to call the Create Order API...</div>

        <script type="text/javascript">
            // Init Cashfree SDK (sandbox now, switch to "production" when live)
            const cashfree = Cashfree({
                mode: "sandbox"
                //mode: "production"
            });

            const btn = document.getElementById("renderBtn");
            const outputEl = document.getElementById("output");

            function setOutput(msg) {
                outputEl.textContent = msg;
            }

            function appendOutput(msg) {
                outputEl.textContent += "\n" + msg;
            }

            btn.addEventListener("click", async () => {
                try {
                    setOutput("Calling CreateOrder (Default.aspx/CreateOrder)...\nPlease wait...");

                    // 🔥 Call the page WebMethod directly
                    const res = await fetch("Default.aspx/CreateOrder", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        body: "{}"   // required by ASP.NET WebMethod
                    });

                    if (!res.ok) {
                        appendOutput("\n❌ HTTP error from server: " + res.status);
                        return;
                    }

                    // ASP.NET WebMethods wrap return value like: { "d": "<string>" }
                    const outer = await res.json();
                    const innerJson = outer.d; // this is the string returned from C#
                    setOutput("Raw response from server:\n" + innerJson);

                    let data;
                    try {
                        data = JSON.parse(innerJson);
                    } catch (e) {
                        appendOutput("\n\n❌ Failed to parse JSON from 'd': " + e);
                        return;
                    }

                    if (!data.payment_session_id) {
                        appendOutput("\n\n❌ payment_session_id is missing in the response.");
                        return;
                    }

                    const paymentSessionId = data.payment_session_id;
                    appendOutput("\n\n✅ payment_session_id:\n" + paymentSessionId);

                    // Now call Cashfree Checkout
                    const checkoutOptions = {
                        paymentSessionId: paymentSessionId,
                        redirectTarget: "_self"
                    };

                    cashfree.checkout(checkoutOptions);
                } catch (err) {
                    appendOutput("\n\n❌ Exception: " + err);
                }
            });
        </script>
    </form>
</body>
</html>