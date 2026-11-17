# Subscription sample security

The samples are integration references, not multi-tenant billing platforms and not a security/compliance certification. Run with test data and sandbox credentials by default. Keep merchant credentials on the server.

## Source publication

- Only source, tests, documentation, bank-directory reference data, dependency locks and empty `.env.example` templates belong in Git.
- Never commit `.env`, local passwords, Cashfree App IDs/secrets, `data/`, raw API responses, customer records, logs, tunnel URLs, browser traces, screenshots, keys or certificates.
- If a real credential was previously exposed, revoke/rotate it through the issuing system. Removing a value from a later commit does not remove it from Git history. This change does not rewrite existing repository history.
- The repository CI checks the two subscription sample directories for prohibited artifacts and credential patterns, audits dependencies and runs regression tests. Run the checks before publishing changes.

## Deployment

Use HTTPS, a unique password of at least 12 characters, restricted operator access, a private persistent data volume, and a secret manager. The hosted sample uses browser Basic authentication; the seamless sample uses HttpOnly, SameSite session cookies. Credentials entered through the seamless UI remain server-side and expire with their session. Do not reuse a development password or share production keys with public users.

The seamless demo checks mutation origins, limits login attempts, rotates authenticated sessions and validates webhook signatures over the original bytes. Callback parameters are not proof of successful payment: both samples fetch status with server-side credentials. Only the seamless sample implements the signed webhook endpoint. Configure webhook events and validate merchant/account enablement independently.

Local records can still contain the customer name, email and phone needed by the sample. Give access only to authorised operators; define retention and deletion rules for your deployment. Instrument details are not needed for fulfilment. Do not send card/bank data to analytics or generic request-body logging. Inspector logs redact credentials and sensitive payloads; callback diagnostics omit raw bodies.

The hosted sample's public return route displays only status/correlation information and requires a subscription-bound HMAC state that expires in one hour before fetching status. Add rate limiting at your ingress and retain an authenticated, session-bound mapping when extending the sample. Implement durable billing/idempotency records, per-user authorisation, entitlement rules and production monitoring before extending either app into a production service.

## Reporting

Do not paste credentials or customer data into public GitHub issues. Contact care@cashfree.com or your organisation's approved private security-reporting channel.

## Publication verification (2026-11-17)

The prepared source change passed a Gitleaks v8.30.1 source scan and an exact-match check against the working demo's local credentials/password, with no matches. Neither local credentials nor runtime customer records were copied. Both app dependency audits reported zero vulnerabilities. Local validation passed 27 seamless API/security tests, 17 hosted-checkout tests and 30 desktop/mobile browser tests. These results cover this source change and its dependencies at review time, not all historical commits or a separately deployed service.
