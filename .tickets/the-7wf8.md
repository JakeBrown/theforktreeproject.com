---
id: the-7wf8
status: open
deps: []
links: [the-ugxp]
created: 2026-06-18T04:40:48Z
type: task
priority: 1
assignee: Jake Brown
---
# Provision journal search Cloudflare resources

Before semantic search can run in production, create the Vectorize index named forktree-journal with 768 dimensions/cosine metric and add the optional JOURNAL_SEARCH_KV binding for index status. Local Wrangler auth is currently invalid, so this could not be verified from the CLI. Command: npx wrangler vectorize create forktree-journal --dimensions=768 --metric=cosine

