# Threat model

Deflake treats CI output as potentially secret-bearing and untrusted.

## Assets

- Project tokens, webhook secrets, uploaded run artifacts, AI prompts

## Trust boundaries

| Boundary | Control |
|----------|---------|
| Local CLI → disk | redaction before write |
| CLI → dashboard | Bearer token + optional HMAC |
| Dashboard → DB | RLS by org membership |
| CLI → AI | opt-in, redacted clusters only |

## Non-goals

- Guaranteeing statistical certainty from 10 attempts
- Preventing malicious maintainers of a checked-out repo from reading local env
