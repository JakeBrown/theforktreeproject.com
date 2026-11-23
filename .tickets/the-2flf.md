---
id: the-2flf
status: open
deps: []
links: []
created: 2026-11-23T09:45:15Z
type: feature
priority: 1
assignee: Jake Brown
---
# Protect admin with Cloudflare Access email login

Replace the /admin Basic-auth logins with Cloudflare Access. Allow one-time-PIN email login for liz@theforktreeproject.com, maddie@theforktreeproject.com and jake@jakebrown.net, and add an Access service token for programmatic testing. The Worker must verify the Cf-Access-Jwt-Assertion JWT (signature, audience, issuer, expiry) and fail closed, so the workers.dev URL and any route Access misses stay protected.


## Notes

**2026-11-23T22:11:49Z**

Access app 'Forktree Project Admin' (e62b9e16-2e5b-49c1-9171-a34e7c401a92, Windy Bit org) covers /admin on www, apex and workers.dev; Allow policy for liz@theforktreeproject.com, maddie@theforktreeproject.com, jake@jakebrown.net via one-time PIN; Service Auth policy for service token forktree-admin-test (client ID 79cf402ddc3082c8e309d55b43d82efa.access, expires 2027-11-23; secret in gitignored CREDS.md). Basic auth removed. Middleware verifies Cf-Access-Jwt-Assertion (RS256, iss, aud, exp/nbf) and matches admin paths on the decoded, case-insensitive pathname (independent review found /%61dmin reached admin pages without auth in the old Basic-auth code; Access already blocked it live, and Analytics Engine since 2026-08-23 shows no such requests). Key cache: forced refetch at most once a minute; cached keys kept if a refresh fails. Verified: 26 tests, production build, wrangler dev with a real Access JWT (200 on admin pages; 403 for none/garbage/tampered/encoded-path without token).
