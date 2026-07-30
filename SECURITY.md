# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | yes       |

## Reporting

Email security concerns privately or open a GitHub security advisory on [KhyFee/Deflake](https://github.com/KhyFee/Deflake).

Please do not file public issues for unpatched vulnerabilities.

## Threat model (summary)

- Untrusted CI logs may contain secrets → redaction before persistence / AI.
- Project tokens are bearer credentials → hashed at rest, rotatable.
- Dashboard never executes Playwright or user-supplied shell.
- AI suggestions are advisory only and must cite captured evidence.
