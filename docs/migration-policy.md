# Migration policy

Artifacts use `schemaVersion: 1`. Readers support the current version and one previous version.

When bumping:
1. Keep old readers working for one release
2. Document the change in CHANGELOG
3. Dashboard ingest rejects unknown future versions with 400
