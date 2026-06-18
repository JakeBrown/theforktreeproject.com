---
id: the-d0bp
status: closed
deps: []
links: []
created: 2026-06-18T05:31:43Z
type: task
priority: 2
assignee: Jake Brown
---
# Tune journal search result ordering and snippets

Order search results newest-first. For keyword fallback/matches, show the matching sentence as the preview. For semantic matches, label the result as semantic in the UI.


## Notes

**2026-06-18T05:34:05Z**

Updated journal search so keyword fallback results are sorted newest-first and snippets use the best matching sentence. Semantic results are also sorted newest-first among returned matches and now carry matchType=semantic for UI labelling. Added a Semantic match badge on search result cards.
