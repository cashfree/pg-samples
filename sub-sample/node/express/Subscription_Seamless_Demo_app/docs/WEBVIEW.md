# UPI Intent in a mobile WebView

The web app renders a returned UPI app chooser only on mobile devices. Links come from Cashfree's `upiIntentData.androidAuthAppLinks` / `iosAuthAppLinks`; do not build mandate URIs manually. Test on a real device with an installed UPI app. Browser emulation only verifies the UI.

After the user selects an app, the frontend tries an optional native bridge, then normal URL navigation. Native integration belongs in your host app. Loading the page in a WebView without native URL handling cannot guarantee payment app launch.

## Android: intercept navigation

For a host without a custom bridge, `window.location.assign(uri)` reaches `shouldOverrideUrlLoading`. This Kotlin sketch shows the relevant interception. Adapt package allowlists and HTTPS navigation rules to your app and supported PSPs. Keep Android System WebView updated.

```kotlin
private val upiSchemes = setOf("upi", "gpay", "tez", "phonepe", "paytmmp", "bhim", "amazonpay")
private val upiPackages = setOf(
    "com.google.android.apps.nbu.paisa.user", "com.phonepe.app",
    "net.one97.paytm", "in.org.npci.upiapp", "in.amazon.mShop.android.shopping"
)

webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
webView.webViewClient = object : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val uri = request.url
        if (uri.scheme == "https") return false // Apply your payment navigation allowlist here.
        if (!request.isForMainFrame) return true
        if (uri.scheme != "intent" && uri.scheme !in upiSchemes) return true
        try {
            val parsed = if (uri.scheme == "intent")
                Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME)
            else Intent(Intent.ACTION_VIEW, uri)
            // Reject an intent whose underlying scheme isn't an approved UPI scheme.
            if (parsed.data?.scheme !in upiSchemes) return true
            if (parsed.`package` != null && parsed.`package` !in upiPackages) return true
            val launch = Intent(Intent.ACTION_VIEW, parsed.data)
                .addCategory(Intent.CATEGORY_BROWSABLE)
            parsed.`package`?.let { launch.setPackage(it) }
            startActivity(launch)
        } catch (e: ActivityNotFoundException) {
            // Show an installed-app message and offer the QR flow.
        } catch (e: URISyntaxException) {
            // Show an invalid-link message; never execute or evaluate the URI.
        }
        return true
    }
}
```

If querying installed packages on Android 11+, declare relevant packages/intents in the manifest's `<queries>`. Start external activities from a user gesture. Preserve the merchant page and its session while leaving for the UPI app.

An existing Android host can instead expose `SubscriptionWebView.openUpiIntent(url)`. It must apply the same URI/package checks and restrict bridge calls to the trusted merchant origin; do not expose a powerful JavaScript interface to arbitrary bank/third-party pages. Navigation interception is sufficient for this demo.

## iOS: intercept navigation or implement the optional bridge

With `WKNavigationDelegate`, intercept approved custom schemes and open them outside the WebView:

```swift
let upiSchemes: Set<String> = ["upi", "tez", "gpay", "phonepe", "paytmmp", "bhim", "amazonpay"]
func webView(_ webView: WKWebView,
             decidePolicyFor navigationAction: WKNavigationAction,
             decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    guard let url = navigationAction.request.url,
          let scheme = url.scheme?.lowercased() else {
        decisionHandler(.cancel); return
    }
    if upiSchemes.contains(scheme) {
        decisionHandler(.cancel)
        UIApplication.shared.open(url, options: [:]) { opened in
            if !opened { /* Offer another installed app or the QR flow. */ }
        }
        return
    }
    decisionHandler(scheme == "https" ? .allow : .cancel)
}
```

For an existing host bridge, register `upiIntent` as a `WKScriptMessageHandler`. The frontend sends `{url: "tez://..."}` to `window.webkit.messageHandlers.upiIntent`. Validate `message.frameInfo.securityOrigin` against your merchant origin and apply the same scheme allowlist before opening the URL. If using `canOpenURL`, configure the corresponding `LSApplicationQueriesSchemes` entries.

Do not treat returning from the UPI app as proof of mandate success. The web app refreshes server status when visible again. A Cashfree return URL or verified webhook also triggers a status fetch.

## Bank authorisation and return

Allow full-page HTTPS navigation and browser form POSTs to the actual Cashfree/issuer/NPCI endpoints returned for your merchant. Do not embed eNACH POST flows in an AJAX call: CORS and navigation semantics differ. The frontend submits hidden form fields, preserving XML and checksum values.

Keep the return URL on your public Node server. Its state token correlates the return even when cross-site POSTs omit the merchant session cookie. After the server's 303 navigation back to the merchant origin, the existing cookie normally resumes the workspace. If the bank opens a separate browser without that cookie, log in/reconfigure the same merchant environment to see the stored subscription; never trust the return's claimed status.
