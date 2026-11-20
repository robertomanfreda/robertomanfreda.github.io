---
title: "Short, specific title: what broke and where"
date: 2026-01-31
summary: "One sentence a triager could read and understand the impact."
program: "Program name (platform)"
class: "IDOR"
cwe: "CWE-639"
severity: high            # critical | high | medium | low | info
cvss: "8.1"
bounty: "$0"
tags: [idor, api]
timeline:
  - 2026-01-02: Reported
  - 2026-01-03: Triaged
  - 2026-01-20: Fixed
  - 2026-01-31: Disclosed
draft: true               # remove this line to publish
---

## Summary

What the target exposed, in two or three sentences.

## Recon

How the interesting surface was found.

## The bug

The first response that looked wrong. Use `http` blocks for raw traffic:

```http
GET /api/v2/accounts/1337/invoices HTTP/2
Host: target.example
Authorization: Bearer <attacker token>
```

```http
HTTP/2 200 OK
Content-Type: application/json

{"owner_id": 42, "invoices": ["..."]}
```

## Proof of concept

Use `console` blocks for commands and their output:

```console
$ curl -s https://target.example/api/v2/accounts/1337/invoices -H "Authorization: Bearer $TOKEN" | jq .owner_id
42
```

## Impact

Who could do what to whom.

## Fix

What the vendor changed, and how it was verified.
