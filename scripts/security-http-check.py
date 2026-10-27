#!/usr/bin/env python3
"""Unauthenticated HTTP attack checks. Run only against a local audit build with dummy secrets."""
import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3005"
results = []


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = urllib.request.build_opener(NoRedirect)


def probe(label, path, method="GET", body=None, headers=None, expected=(401, 403)):
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=headers or {})
    try:
        response = opener.open(req, timeout=12)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status, response_headers, content = response.status, response.headers, response.read()
    assert status in expected, (label, status, expected)
    results.append({"test": label, "status": status})
    return response_headers, content


for method in ["GET", "POST", "PATCH"]:
    probe("unauthenticated integrations " + method, "/api/admin/integrations", method,
          b"{}" if method != "GET" else None, {"Content-Type": "application/json"})
for path in ["/api/admin/staff", "/api/admin/records/portals"]:
    probe("unauthenticated admin mutation " + path, path, "POST", b"{}",
          {"Content-Type": "application/json"})
for path in ["/api/orders", "/api/me",
             "/api/orders/11111111-1111-4111-8111-111111111111/report"]:
    probe("unauthenticated customer access " + path, path)
for path in ["/api/cron/payment-webhooks", "/api/cron/reconcile-payments", "/api/cron/cleanup"]:
    probe("forged cron token " + path, path, "POST", b"{}", {"Authorization": "Bearer forged"})
probe("oversized webhook", "/api/webhooks/razorpay", "POST", b"x" * 262145, expected=(413,))
probe("forged webhook signature", "/api/webhooks/razorpay", "POST",
      b'{"event":"payment.captured","payload":{}}',
      {"x-razorpay-signature": "forged", "x-razorpay-event-id": "evt_attack"}, expected=(400,))
headers, body = probe("invalid checkout token", "/pay/forged", expected=(200, 400, 404))
assert b"checkout.razorpay.com" not in body, "invalid token must not expose checkout script"
headers, _ = probe("login security headers", "/login", expected=(200,))
for key, value in [("X-Frame-Options", "DENY"), ("X-Content-Type-Options", "nosniff")]:
    assert headers.get(key) == value, (key, headers.get(key))
assert "frame-ancestors 'none'" in headers.get("Content-Security-Policy", "")
results.append({"test": "clickjacking, MIME, CSP headers", "status": "pass"})
print(json.dumps(results, indent=2))
