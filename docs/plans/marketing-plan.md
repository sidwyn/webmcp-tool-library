# WebMCPTools Marketing Plan

_Inspired by [obra/superpowers](https://github.com/obra/superpowers) — taking cues from their community-first positioning, progressive disclosure, and narrative-driven README._

---

## 1. Core Positioning

**Current:** A Chrome extension that injects WebMCP tools into websites.
**Proposed:** The community toolkit that gives AI agents real superpowers on the web — before browsers catch up.

### The One-Liner

> "Community-built WebMCP tools that let AI agents actually use websites — not just read them."

### The Elevator Pitch

Browsers will eventually ship the WebMCP API. Until then, WebMCPTools is how the community builds, tests, and ships site-specific tools that let Claude and GPT-4o interact with real websites. No scraping. No brittle automation. Just structured tools that match the spec — ready for the future, useful today.

---

## 2. Lessons from Superpowers

obra's superpowers repo succeeds because of several marketing choices we should adopt:

| Superpowers Pattern | WebMCPTools Adaptation |
|---|---|
| **Methodology, not just a tool** — "an agentic skills framework & software development methodology" | Position as "the community standard for WebMCP tools" not just "a Chrome extension" |
| **Narrative hook** — "It starts from the moment you fire up your coding agent" | Lead with the user story: "Navigate to Google Flights. Ask Claude to find you a cheap flight to Tokyo. Watch it happen." |
| **Outcome-oriented features** — describes what skills *do*, not how they work | "Natural language flight search" not "DOM interaction via content scripts" |
| **Progressive disclosure** — ~100 tokens for scanning, <5k when activated | Our README buries the good stuff. Lead with the demo GIF, not architecture diagrams |
| **Community-as-core** — skills repo, marketplace, contributions | Frame every site module as a community win. Celebrate contributors. |
| **Multi-platform install** — Claude Code, Cursor, Codex, etc. | We're Chrome-only, but should plan for Firefox/Arc and show the path |
| **Personal voice** — "If Superpowers has helped you..." | The current README is good but could be warmer. Lean into the founder story. |

---

## 3. README Restructure

The current README leads with architecture. Superpowers leads with outcomes. Proposed new structure:

### New README Flow

1. **Hero section** — One-liner + demo GIF (above the fold)
2. **"What can it do?"** — 3-4 bullet points showing real user outcomes, not features
3. **30-second install** — Clone, load unpacked, add API key, go
4. **Supported sites table** — with a prominent "Add your site" CTA
5. **How it works** — brief, non-technical explanation
6. **The WebMCP thesis** — why community > company (the existing diagrams are great, keep them)
7. **Architecture** — for contributors, collapsed or in a separate doc
8. **Contributing** — warm invitation, link to CONTRIBUTING.md

### Key Messaging Changes

**Before:** "An open-source Chrome extension platform that injects WebMCP tools into websites."
**After:** "AI agents can search flights, compare prices, and book travel — just by chatting. WebMCPTools gives Claude and GPT-4o real tools on real websites, built by the community."

**Before:** "Each supported site is a self-contained module"
**After:** "Every site module is community-built, open source, and ready to use. Google Flights is live. What should we build next?"

---

## 4. Content & Distribution Strategy

### Phase 1: Foundation (Week 1-2)

- [ ] **Rewrite README** per the structure above
- [ ] **Record a polished demo video** (60-90 seconds) — the existing GIF is good but a narrated video converts better
- [ ] **Write a launch blog post** — "Why I'm Building WebMCP Tools Before Browsers Ship the API"
  - Tell the founder story
  - Explain the chicken-and-egg problem
  - Show the Google Flights demo
  - End with a CTA to contribute
- [ ] **Create a Twitter/X thread** — visual, demo-heavy, 5-7 tweets
  - Tweet 1: "I built a Chrome extension that lets Claude book flights on Google Flights. Here's how it works."
  - Tweet 2: Demo GIF
  - Tweet 3: The WebMCP thesis (community > company)
  - Tweet 4: How tools work (code snippet)
  - Tweet 5: "What site should we add next?" poll
  - Tweet 6: Link to repo

### Phase 2: Community Growth (Week 3-6)

- [ ] **Post to Hacker News** — "Show HN: Community-built WebMCP tools for AI agents"
  - Time it for a weekday morning (US)
  - Have 2-3 supporters ready to comment with genuine experiences
- [ ] **Reddit posts** — r/ClaudeAI, r/ChatGPT, r/webdev, r/SideProject
- [ ] **Discord/community presence** — Anthropic Discord, AI agent communities
- [ ] **"Good first issue" labels** — tag 5-10 easy site modules for newcomers
- [ ] **Site module bounties** — "Want to see Kayak support? Upvote this issue"
- [ ] **Contributor spotlight** — tweet/post about each new site module contributor

### Phase 3: Ecosystem (Week 7-12)

- [ ] **Ship 3-5 more site modules** — prioritize high-demand sites (Kayak, Booking.com, Amazon, YouTube)
- [ ] **"WebMCP Module of the Week"** — highlight community contributions
- [ ] **Integration guides** — "How to use WebMCPTools with Claude Code", "WebMCPTools + Cursor"
- [ ] **Conference talk proposal** — target AI/web dev conferences
- [ ] **Partnership outreach** — reach out to the WebMCP spec authors, Anthropic DevRel, Chrome Extensions team

---

## 5. Target Audiences & Channels

| Audience | Message | Channel |
|---|---|---|
| **AI power users** | "Your AI agent can actually use websites now" | Twitter/X, Reddit r/ClaudeAI, HN |
| **Web developers** | "Build the WebMCP future today — no build step, vanilla JS" | HN, Reddit r/webdev, Dev.to |
| **AI agent builders** | "Structured tools > scraping. WebMCP-compatible schemas." | GitHub, Anthropic Discord |
| **Travel hackers** | "Let Claude find you the cheapest flights automatically" | Reddit r/travel, r/churning, Twitter |
| **Open source contributors** | "Add your favorite site in an afternoon. Here's the template." | GitHub issues, CONTRIBUTING.md |

---

## 6. Competitive Differentiation

| Approach | Limitation | WebMCPTools Advantage |
|---|---|---|
| Browser-use / Playwright agents | Brittle, slow, token-heavy screenshots | Structured tools, fast, token-efficient |
| Official company APIs | Rate-limited, expensive, incomplete | Free, open, community-maintained |
| Scraping / parsing | Breaks on UI changes | DOM interaction via stable patterns |
| Waiting for native WebMCP | Could be years | Polyfill that works today |

**Key differentiator vs. superpowers:** Superpowers makes Claude better at coding. WebMCPTools makes AI agents better at using the web. Complementary, not competitive.

---

## 7. Growth Metrics to Track

- GitHub stars (vanity but signals momentum)
- Number of site modules (core value metric)
- Contributors (community health)
- Issues opened requesting new sites (demand signal)
- Demo video views (top-of-funnel)
- Forks (builder intent)

---

## 8. Quick Wins (Do This Week)

1. **Add a "What site should we build next?" discussion** on GitHub Discussions or Issues — let the community vote
2. **Add badges to README** — stars, license, contributors count
3. **Add a one-line "Quick Start"** at the very top of the README before any explanation
4. **Tweet the demo GIF** with a clear call to action
5. **Add "Built with WebMCPTools" section** — if anyone is using it, showcase them
6. **Cross-link with the WebMCP spec repo** — open an issue or PR mentioning this as a community implementation

---

## 9. Tone & Voice Guidelines

Taking from superpowers' playbook:

- **Conversational, not corporate** — "Here's what it does" not "This solution enables"
- **Show, don't tell** — Demo GIF before architecture diagram
- **Confident but inviting** — "It works. Want to help make it better?"
- **Founder-led** — Personal conviction about the community thesis
- **Outcome-first** — "Book flights with AI" not "Chrome extension with programmatic content script registration"

---

## 10. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Google changes Flights DOM, tools break | Automated smoke tests, community fixes fast |
| WebMCP spec changes significantly | Modular architecture makes adaptation easy |
| Low contributor interest | Start with bounties, make contributing dead-simple (it already is) |
| Chrome Web Store rejection | Distribute via GitHub initially, CWS later with compliance |
| Perceived as "just scraping" | Emphasize spec-compliance, structured schemas, polyfill story |
