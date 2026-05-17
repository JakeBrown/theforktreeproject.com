---
id: theforktreeproject.com-f9u
status: closed
deps: []
links: []
created: 2026-04-02T03:11:42Z
type: feature
priority: 2
---
# Add server-side analytics via Cloudflare Analytics Engine

Log page views server-side using Workers Analytics Engine. Add analytics_engine_datasets binding to wrangler config. On each page request, write a data point with: blob1=path, blob2=referrer, blob3=country, blob4=device/user-agent, blob5=method. Free tier: 100K writes/day, 10M reads/month. No client-side JS needed.


