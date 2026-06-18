---
id: the-bq3k
status: closed
deps: []
links: []
created: 2026-06-18T05:41:25Z
type: task
priority: 2
assignee: Jake Brown
---
# Refine compact journal controls

Make the blog search control smaller by default, animate its expansion smoothly on focus, and place the Show topics toggle alongside the search control.


## Notes

**2026-06-18T05:46:22Z**

Made the journal filter controls more compact: search starts at 205px (190px mobile), expands smoothly on focus using width/flex-basis transitions, and the Show topics toggle sits alongside it. Moved the Explore by topic heading/intro into the collapsed topic panel and made the topics panel slide open with max-height/opacity/translate animation instead of appearing instantly.
