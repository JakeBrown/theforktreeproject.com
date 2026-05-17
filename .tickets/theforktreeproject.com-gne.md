---
id: theforktreeproject.com-gne
status: closed
deps: []
links: []
created: 2026-05-08T03:14:45Z
type: task
priority: 1
---
# Education: swap Learning by Doing and Aligned with Curriculum photos

Per Liz's Apr 24 email (StpQ48K7ZEGg). Liz's reasoning: the nursery photo shows students "actually doing" — fits Learning by Doing. The slopes photo shows them "being taught" — fits Aligned with Curriculum.

Current state (reversed from her ask):
- Learning by Doing → edu-learning.jpg = students on slopes/hillside
- Aligned With Curriculum → edu-curriculum.jpg = Liz with students in the nursery potting plants

Target state:
- Learning by Doing → nursery photo (currently edu-curriculum.jpg)
- Aligned With Curriculum → slopes photo (currently edu-learning.jpg)

Two ways to do it:
(a) just swap the src attrs in src/pages/education1.astro lines 31 + 55 (and update alt text)
(b) rename files and swap (cleaner long-term)

(a) is faster. Update alt text either way:
- Learning by Doing photo alt: "Students potting native seedlings in The Forktree Project nursery"
- Aligned with Curriculum photo alt: "Students on a revegetation slope at The Forktree Project"


