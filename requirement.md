# UI OS — Product Requirements Document

**Version:** Product baseline 1.0
**Initial target:** React + Next.js + TypeScript + Tailwind CSS
**Architecture style:** Local-first control plane with framework adapters
**Primary interface:** CLI + MCP + Agent Skills
**Production runtime requirement:** None

---

# 1. Product Definition

UI OS is a repository-native control plane that gives coding agents four capabilities:

```text
REUSE
Find existing UI before creating more.

UNDERSTAND
Retrieve meaning, patterns and accepted design rules.

CONVERGE
Measure and diagnose differences between intended and rendered UI.

DOCTOR
Deterministically enforce objective UI requirements.
```

UI OS does not write application UI by itself.

The user's coding agent remains responsible for implementation.

---

# 2. System Architecture

The conceptual architecture is:

```text
                          CODING AGENT
                               │
                               ▼
                         Agent Interface
                     MCP / Skills / AGENTS
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│                        UI OS CORE                        │
│                                                          │
│  Reuse Engine  Semantic Model  Convergence  Doctor      │
│       │             │              │           │          │
└───────┼─────────────┼──────────────┼───────────┼──────────┘
        │             │              │           │
        ▼             ▼              ▼           ▼
     React         Knowledge      Browser      Rules
     source         files         evidence
        │
        ├─────────────── Adapters ─────────────────────┐
        ▼                    ▼                         ▼
    Tailwind               Figma                   Storybook
        │                    │                         │
        └──────────── shadcn / registries ────────────┘
```

---

# 3. Core Package Boundary

Recommended package shape:

```text
packages/
  core/
  cli/
  analyzer/
  index/
  doctor/
  convergence/

  adapters/
    react/
    next/
    tailwind/
    storybook/
    shadcn/
    figma-code-connect/
    playwright/

  agents/
    mcp/
    skills/
```

`core` must know nothing about React.

It operates on normalized UI entities.

Future:

```text
adapters/vue
adapters/svelte
```

must be possible without redesigning the semantic model.

---

# 4. Core Domain Model

UI OS should maintain a normalized UI model.

## Component

A reusable implementation.

Fields conceptually include:

```text
id
name
source
framework
props
variants
imports
usage count
usage locations
sources
semantic metadata
status
```

## Pattern

A reusable product-level composition.

Examples:

```text
settings-page
danger-zone
entity-list
master-detail
filter-bar
async-collection
```

## Rule

An accepted constraint that may be checked.

## Convention

Canonical project vocabulary or preferred practice.

## Lesson

A durable known pitfall or anti-pattern.

## Source

Evidence coming from:

```text
React
Figma
Storybook
Tailwind
shadcn
tests
documentation
```

## Proposal

A machine- or agent-inferred candidate that is not yet accepted truth.

## Design Contract

A normalized representation of a particular intended design used during convergence.

## Actual Snapshot

Browser-derived implementation evidence used during convergence.

---

# 5. Source of Truth

Different tools own different facts.

```text
Visual intent
→ Figma

Executable behavior
→ application source

Styling tokens
→ Tailwind/theme/token source

Component examples
→ Storybook/repository examples

Product meaning and accepted rules
→ UI OS accepted knowledge

Machine inference
→ Proposed only

Chat
→ Never authoritative
```

UI OS reports conflict.

It must not silently resolve conflicting sources.

---

# 6. Repository State

UI OS should have two categories of local data.

## Accepted repository state

Committed and reviewable.

Conceptually:

```text
.ui/
  config.*
  CONVENTIONS.md
  LESSONS.md
  components/
  patterns/
  rules/
```

## Generated state

Reconstructable and normally ignored.

```text
.ui/cache/
.ui/runs/
.ui/reports/
```

Exact file formats must be decided by ADR before implementation.

Requirements:

* versioned schema;
* human-readable diffs;
* no secrets;
* stable IDs;
* migration path.

---

# 7. CLI Surface

The intended command model is:

```bash
ui init
ui adopt

ui search <query>
ui inspect <entity>
ui context <task>

ui proposal list
ui proposal show <id>
ui proposal accept <id>
ui proposal reject <id>

ui doctor
ui doctor --json

ui converge
ui converge --json
```

Later:

```bash
ui benchmark
ui migrate
ui pack
```

The CLI must be understandable without documentation spelunking.

---

# 8. PHASE 1 — REUSE FOUNDATION

## 8.1 Phase Goal

Make UI OS useful in a normal React repository before requiring any manual semantic knowledge.

Phase 1 answers:

> **What UI already exists?**

---

# 8.2 React Analyzer

The analyzer must discover:

* exported React components;
* default and named exports;
* component source paths;
* TypeScript props;
* imported dependencies;
* component composition;
* JSX usage;
* usage frequency;
* call sites;
* variant props when statically visible.

It should build a component usage graph:

```text
SettingsPage
   │
   ├── SettingsSection
   │      ├── TextField
   │      └── Button
   │
   └── DeleteWorkspaceSection
          └── ConfirmationDialog
```

### Phase 1 Tasks

1. Select and document AST strategy.
2. Implement TypeScript project resolution.
3. Detect React component definitions.
4. Detect component exports.
5. Extract props.
6. Build import graph.
7. Build JSX usage graph.
8. Handle path aliases.
9. Handle monorepo package boundaries.
10. Cache results incrementally.
11. Produce stable component IDs.
12. Create fixtures for common Next.js patterns.

---

# 8.3 Tailwind Analyzer

UI OS must detect:

* Tailwind presence/version;
* theme variables;
* configured custom tokens;
* utility usage;
* static class strings;
* common class-merging utilities;
* repeated normalized class bundles.

Tailwind v4 already treats theme variables as a design-token-backed utility API, so UI OS should ingest those values rather than introducing a new token system.

Example:

```tsx
className="flex items-center gap-4 rounded-lg px-4 py-3"
```

appears seven times.

Phase 1 reports:

```text
REUSE-101

Repeated static UI structure detected.

Occurrences: 7

Common bundle:
flex items-center gap-4 rounded-lg px-4 py-3

This may represent an existing or missing reusable abstraction.

Severity: info
```

It does not automatically create a component.

### Tasks

1. Detect Tailwind project.
2. Parse theme configuration/theme CSS.
3. Index project token names.
4. Extract static `className` values.
5. Understand common `cn()`/`clsx()` patterns where statically possible.
6. Normalize class ordering for comparison.
7. Detect exact repeated bundles.
8. Record usage locations.
9. Avoid analyzing generated/build output.
10. Add configurable repetition threshold.

Similarity-based matching comes later.

---

# 8.4 Existing Component Discovery

Phase 1 should ingest evidence from available tools.

## shadcn

Detect:

```text
components.json
installed registry components
registry namespaces
```

shadcn already provides MCP-based registry discovery/install, so UI OS only needs to understand what is present and prefer it appropriately.

## Storybook

If available, consume its generated component manifest rather than reimplementing its documentation parser.

Storybook manifests already contain component names, descriptions, props and usage examples.

### Tasks

1. Detect shadcn configuration.
2. Map installed source-owned components.
3. Detect Storybook.
4. Read stable available manifest output behind adapter abstraction.
5. Connect manifest entries to source components.
6. Record stories/examples as evidence.
7. Degrade gracefully when either system is absent.

---

# 8.5 Reuse Search

Required commands:

```bash
ui search "empty state"
ui search Button
ui inspect DeleteWorkspaceSection
```

Phase 1 ranking may use:

* component name;
* filename;
* JSDoc;
* Storybook description;
* story names;
* usage locations;
* exported props;
* registered source metadata.

No hosted embedding service is required.

The coding agent itself already has semantic reasoning ability.

UI OS's responsibility is to give it structured, targeted evidence.

---

# 8.6 `ui context`

Example:

```bash
ui context "build team settings"
```

Output:

```text
Relevant existing components

SettingsLayout
  19 usages

SettingsSection
  47 usages

MemberTable
  4 usages

InviteMemberDialog
  6 usages

Existing pages

app/settings/profile/page.tsx
app/settings/billing/page.tsx

Potentially relevant stories

SettingsSection / Default
MemberTable / Empty
```

`--json` is mandatory.

---

# 8.7 Agent Instruction Floor

`ui init` generates a tiny portable instruction block:

```text
Before creating reusable UI:
- Search UI OS.
- Reuse an existing component when it already expresses the intended concept.
- Do not replace deliberate custom UI merely to satisfy reuse.
- Run ui doctor before declaring UI work complete.
```

Never put the full registry into AGENTS.md.

---

# 8.8 Phase 1 Acceptance Criteria

Phase 1 is complete when:

* installation works in a real Next.js application;
* no source rewrite is required;
* component inventory is accurate on benchmark repos;
* usage graph is useful;
* Tailwind theme is detected;
* exact repeated class structures are reported;
* Storybook/shadcn are optional;
* `search`, `inspect`, and `context` work;
* agent context remains compact;
* real coding-agent benchmark shows improved existing-component reuse.

---

# 9. PHASE 2 — UNDERSTAND

## 9.1 Phase Goal

Move from:

> Here are the components.

to:

> Here is the product's UI language.

---

# 9.2 Semantic Component Metadata

Important components can have additional accepted knowledge.

Conceptually:

```yaml
component: DeleteWorkspaceSection

purpose:
  Permanently delete a workspace.

intent:
  destructive-resource-lifecycle

useWhen:
  - deleting the entire workspace

avoidWhen:
  - deleting individual records

patterns:
  - danger-zone

requires:
  - destructive-confirmation
  - workspace-name-verification
```

This metadata must remain optional.

Button does not need a dissertation.

---

# 9.3 Patterns

Patterns become first-class.

Examples:

```text
SettingsPage
DangerZone
EntityList
EmptyState
SearchResults
MasterDetail
ConfirmationFlow
AsyncCollection
```

A pattern defines product structure, not exact visuals.

Example:

```text
AsyncCollection

Required conceptual states:
loading
error
empty
populated
```

How each state looks remains the design system's decision.

---

# 9.4 Rules

Rules must have a clear classification.

## Objective

Can become Doctor errors.

Example:

```text
DeleteWorkspaceSection requires ConfirmationDialog.
```

## Heuristic

Warnings only.

Example:

```text
Pages normally have one dominant primary action.
```

## Advisory

Agent/human guidance only.

Example:

```text
Prefer lighter visual hierarchy in secondary settings sections.
```

This separation is critical.

---

# 9.5 Proposal Lifecycle

Analysis may discover:

```text
DeleteWorkspaceSection appears in all organization settings pages and always uses ConfirmationDialog.
```

UI OS may propose:

```text
Candidate pattern:
danger-zone

Candidate rule:
delete-workspace requires confirmation
```

Status:

```text
PROPOSED
```

Human/agent may review.

Then:

```bash
ui proposal accept UI-P-021
```

Only then may it become accepted knowledge.

---

# 9.6 Figma Code Connect Enrichment

Phase 2 does not yet perform visual convergence.

It simply connects evidence.

Figma Code Connect already lets Figma MCP provide agents with component imports, implementation snippets, property mappings and custom instructions.

UI OS stores references such as:

```text
DeleteWorkspaceSection

React:
src/settings/DeleteWorkspaceSection.tsx

Figma:
component/node reference

Code Connect:
mapped

Storybook:
Settings/DeleteWorkspace
```

The Figma integration remains optional.

---

# 9.7 Conventions and Lessons

Following the Persist model, two pieces of memory deserve first-class support.

## CONVENTIONS

Names the reusable UI vocabulary.

```text
DangerZone
SettingsSection
EntityTable
PageHeader
InlineFeedback
```

## LESSONS

Captures mistakes we do not want agents to repeat.

Example:

```text
Do not infer destructive semantics solely from red styling.
Several non-destructive warning components also use red tokens.
Use accepted intent metadata or existing pattern evidence.
```

---

# 9.8 Phase 2 Tasks

1. Design semantic schema.
2. Design pattern schema.
3. Design rule classifications.
4. Design stable identity rules.
5. Implement proposal status model.
6. Implement accept/reject lifecycle.
7. Add conventions.
8. Add lessons.
9. Add source relationships.
10. Implement Figma Code Connect reference adapter.
11. Improve context retrieval using semantic metadata.
12. Add anti-pattern/avoidWhen retrieval.
13. Add conflict detection between accepted metadata and source.
14. Create agent skill for registering/reviewing new reusable UI.

---

# 9.9 Phase 2 Acceptance

The agent must be able to distinguish:

```text
DeleteRecordDialog
DeleteWorkspaceSection
ArchiveWorkspaceDialog
```

because their semantic purpose differs, even if all contain visually destructive buttons.

That is the bar.

---

# 10. PHASE 3 — DOCTOR

## 10.1 Goal

Turn the accepted UI contract into trustworthy checks.

---

# 10.2 Doctor Contract

```bash
ui doctor
```

Exit:

```text
0 = healthy
1 = warnings
2 = errors
```

Machine interface:

```bash
ui doctor --json
```

Schema version must be explicit.

---

# 10.3 Finding Model

Every finding includes:

```text
ruleId
severity
message
source
relatedEntity
evidence
suggestedAction
```

Example:

```json
{
  "ruleId": "UI204",
  "severity": "error",
  "message": "DeleteWorkspace requires the canonical confirmation flow.",
  "source": "app/settings/workspace/page.tsx",
  "entity": "delete-workspace"
}
```

---

# 10.4 Hard-Error Categories

Hard errors are restricted to objective checks.

Examples:

### Structural integrity

Accepted component source disappeared.

### Rule integrity

Rule points to nonexistent entity.

### Explicit prohibited composition

Accepted rule says component X cannot appear inside pattern Y.

### Required composition

An explicit accepted component requirement is statically provable and missing.

### Deprecated component

Repository explicitly prohibits further use.

### Invalid design-system metadata

Malformed or conflicting accepted state.

---

# 10.5 Warnings

Warnings may include:

```text
exact repeated Tailwind structure
likely duplicate JSX
possible canonical-component bypass
stale Figma mapping
registered component with no usages
missing semantic description for high-reuse component
oversized agent context
```

Warnings should not block work by default.

---

# 10.6 Accessibility

UI OS should not pretend it can solve accessibility by itself.

Static checks may catch some problems.

For runtime accessibility, UI OS should integrate established tools.

Playwright explicitly supports axe-powered browser scans but also notes that automated accessibility testing cannot identify every accessibility problem.

Therefore UI OS reports:

```text
automated accessibility checks
```

not:

```text
this product is accessible
```

---

# 10.7 Suppression

Rules must support intentional suppression.

A suppression requires:

```text
rule
scope
reason
```

Example:

```text
UI301 suppressed for CanvasEditor because this UI intentionally uses
a custom interaction model. See ADR-...
```

No anonymous:

```text
// ignore ui
```

for hard policy violations.

---

# 10.8 Phase 3 Tasks

1. Define Doctor rule API.
2. Define severity model.
3. Define stable finding IDs.
4. Define JSON schema.
5. Implement structural checks.
6. Implement broken-reference checks.
7. Implement deprecation rules.
8. Implement accepted composition rules.
9. Implement context-budget checks.
10. Implement deterministic token-policy checks.
11. Add configurable runtime accessibility adapter.
12. Add suppressions.
13. Add CI documentation.
14. Add golden output tests.
15. Add false-positive benchmark suite.
16. Add security tests for repository scanning and writes.

---

# 10.9 Phase 3 Acceptance

Doctor is ready when we are comfortable putting this into a real repository:

```bash
pnpm test
ui doctor
```

and trusting its exit code.

---

# 11. PHASE 4 — CONVERGE

## 11.1 Goal

Remove repeated human mechanical correction between Figma intent and browser implementation.

---

# 11.2 Design Contract

Convergence requires a normalized design input.

UI OS should **not** scrape arbitrary Figma internals independently.

Figma MCP already exposes components, variables and layout context to coding agents.

A UI OS Agent Skill can coordinate with Figma MCP and produce a normalized ephemeral Design Contract.

Conceptually:

```text
DesignContract

source:
  Figma node/frame

viewport:
  1440 × 900

regions:
  header
  sidebar
  content

componentMappings:
  FigmaButton → Button
  DangerSection → DeleteWorkspaceSection

layout:
  measured constraints

tokens:
  available design-token references

text:
  hierarchy and content

states:
  captured state
```

This is evidence, not a replacement for the Figma file.

---

# 11.3 Actual Snapshot

Using Playwright, UI OS captures:

```text
DOM
accessibility tree
bounding boxes
computed styles
viewport
overflow
visibility
selected screenshots
```

Playwright already provides deterministic web assertions and screenshot comparisons, so UI OS should build on those capabilities.

---

# 11.4 Comparison Layer 1 — Semantic

Run first.

Examples:

```text
Expected:
Button

Actual:
raw <button>

Expected:
DeleteWorkspaceSection

Actual:
custom red Card

Expected:
size="md"

Actual:
size="lg"
```

Semantic problems should be fixed before pixel differences.

---

# 11.5 Comparison Layer 2 — Structural

Compare:

```text
bounds
alignment
gaps
layout direction
width/height
overflow
responsive transition
visibility
relative placement
```

Example:

```text
CONVERGE-LAYOUT-18

SettingsContent.top

Expected: 184px
Actual:   200px
Delta:     16px
```

---

# 11.6 Comparison Layer 3 — Visual

Compare:

```text
typography
color
radius
borders
shadows
icons
selected graphical output
```

Screenshot comparison should be the final layer rather than the first.

Browser rendering can vary by host environment, which Playwright itself warns about, so convergence environments need normalization.

---

# 11.7 Node-to-DOM Correspondence

This is one of the hardest technical problems in the project.

UI OS must not pretend it is trivial.

Possible evidence sources include:

```text
Code Connect component mapping
React component identity
accessible role/name
text content
test IDs
developer-supplied anchors
agent-supplied anchors
layout relationships
```

Phase 4 must support uncertainty.

Example:

```text
Mapping confidence: 0.61

Figma node "Billing Summary" may correspond to:
1. SubscriptionSummary
2. BillingCard

Manual/agent confirmation recommended.
```

Low-confidence mapping must never become a hard Doctor failure.

---

# 11.8 Responsive Convergence

A design is not one screenshot.

Configured viewports may include:

```text
mobile
tablet
desktop
```

Convergence runs separately for each.

It should detect:

```text
overflow
unexpected wrapping
hidden content
incorrect layout mode
touch-target issues
```

---

# 11.9 Stabilization

Before comparisons:

* wait for fonts;
* disable/settle animations;
* stabilize test data;
* hide configured dynamic elements;
* wait for loading completion;
* normalize browser/device profile.

Otherwise convergence reports noise.

---

# 11.10 Convergence Output

Do not reduce everything to:

```text
92.7% similar
```

Produce category findings:

```text
Semantic       PASS
Components     11/12 canonical
Tokens         37/40
Structure      4 findings
Responsive     2 findings
Accessibility  PASS
Visual         3 material differences
```

A summary score may exist for benchmarking but must not drive behavior blindly.

---

# 11.11 Phase 4 Tasks

1. Define Design Contract schema.
2. Build Figma-MCP capture Agent Skill.
3. Add Code Connect enrichment.
4. Build browser snapshot format.
5. Build Playwright capture adapter.
6. Capture computed layout.
7. Capture accessibility tree.
8. Implement element correspondence research prototype.
9. Support explicit anchors.
10. Add mapping confidence.
11. Implement semantic comparison.
12. Implement structural comparison.
13. Implement token/style comparison.
14. Implement screenshot comparison.
15. Add viewport profiles.
16. Add environment stabilization.
17. Produce convergence JSON schema.
18. Produce human-readable report.
19. Create benchmark Figma screens.
20. Measure correction-turn reduction.

---

# 11.12 Phase 4 Acceptance

A benchmark UI should go from:

```text
agent implementation
→ repeated human "fix this" loop
```

to:

```text
agent implementation
→ convergence report
→ agent corrections
→ significantly fewer human corrections
```

That is the only meaningful success criterion.

---

# 12. PHASE 5 — CLOSED-LOOP AGENT WORKFLOW

## 12.1 Goal

Allow an agent to safely repeat the Build → Check → Repair loop.

---

# 12.2 Agent Skill

Conceptual skill:

```text
converge-ui
```

Process:

```text
1. Retrieve UI context.
2. Search for reusable components.
3. Inspect required patterns.
4. Implement.
5. Run Doctor.
6. Run Convergence.
7. Read machine findings.
8. Fix highest-confidence issues.
9. Repeat.
10. Stop and hand off.
```

---

# 12.3 Stop Conditions

The loop must stop when any occurs:

```text
maximum iterations reached
all required semantic checks pass
Doctor errors = 0
improvement falls below threshold
remaining issues require human judgment
mapping confidence too low
design/source conflict exists
```

---

# 12.4 Preventing Screenshot Gaming

The agent must not be rewarded purely for pixel similarity.

A solution like:

```css
transform: translateX(1.43px)
```

may improve screenshots while making the code worse.

Therefore convergence priority is:

```text
1. semantic correctness
2. canonical component reuse
3. accessibility
4. structural correctness
5. token correctness
6. visual similarity
```

Visual matching is deliberately last.

---

# 12.5 Repair Boundaries

An agent may automatically repair:

```text
wrong known variant
known token mismatch
straightforward spacing mismatch
missing known wrapper
responsive class mistake
```

It should escalate:

```text
major product hierarchy disagreement
ambiguous component mapping
conflict between Figma and accepted rule
new reusable pattern
significant API redesign
novel interaction behavior
```

---

# 12.6 Human Handoff Report

After convergence:

```text
UI READY FOR REVIEW

Reused:
9 canonical components

Created:
1 new local component

Doctor:
0 errors
2 warnings

Convergence:
semantic ✓
responsive ✓
accessibility automated checks ✓
3 low-priority visual deviations remain

Human decisions requested:
- confirm information hierarchy
- confirm mobile interaction for filter panel
```

This is what "done" should look like.

---

# 12.7 Benchmark Framework

Create a benchmark set of realistic tasks.

Examples:

```text
settings page
billing page
user-management table
onboarding flow
dashboard
search results
detail page
destructive workflow
complex responsive form
custom branded landing section
```

Each benchmark contains:

```text
Figma intent
existing component library
accepted UI knowledge
expected reuse opportunities
known quality requirements
```

Run:

### Control

```text
coding agent + Figma MCP
```

### Treatment

```text
coding agent + Figma MCP + UI OS
```

Measure:

```text
human correction turns
duplicate components
raw Tailwind added
canonical component reuse
Doctor errors
time to approved implementation
```

---

# 12.8 Phase 5 Tasks

1. Build convergence Agent Skill.
2. Build repair-loop protocol.
3. Define iteration budget.
4. Define prioritization rules.
5. Add zero-progress detection.
6. Add source-conflict escalation.
7. Add human-handoff report.
8. Build benchmark harness.
9. Run multiple coding agents.
10. Measure correction-turn reduction.
11. Publish benchmark methodology.
12. Harden Next.js consumer install.
13. Test packed/published package, not workspace source.
14. Run production Next build.
15. Run CI matrix.
16. Document unsupported situations honestly.

---

# 13. MCP Tool Surface

Recommended eventual read-oriented tools:

```text
search_ui
get_component
get_pattern
get_rules
get_examples
get_sources
get_reuse_candidates
get_task_context
get_doctor_report
get_convergence_report
```

Explicit mutation tools may later include:

```text
create_proposal
accept_proposal
reject_proposal
```

Acceptance must remain explicit.

---

# 14. What UI OS Does NOT Provide

UI OS does not provide:

```text
mandatory Button/Card/Input implementations
a proprietary CSS system
a new component syntax
a Figma renderer
a browser engine
its own accessibility standard
an opinion about what every application should look like
a requirement to use shadcn
a requirement to use Storybook
a requirement to use Figma
```

The product must remain useful in a plain:

```text
Next.js + Tailwind + custom components
```

application.

---

# 15. Critical Research Risks

## Figma node ↔ DOM mapping

Probably the largest convergence research problem.

## False reuse recommendations

Similar visuals do not necessarily mean equivalent semantics.

## Tailwind dynamic classes

Static analysis cannot perfectly resolve arbitrary runtime class construction.

## Next.js compilation complexity

Server Components, Client Components and framework transforms need real-app tests.

## Visual nondeterminism

Fonts, OS rendering and animations can produce noisy diffs.

## Context ranking

Large repositories need targeted retrieval without hiding the correct component.

## Metadata burden

If semantic registration feels like paperwork, adoption fails.

These should be treated as product risks, not swept into implementation details.

---

# 16. Required ADRs

Before major implementation, create accepted ADRs for:

```text
ADR-0001 UI OS ownership boundary
ADR-0002 framework-neutral core
ADR-0003 React/Next.js-first support
ADR-0004 repository knowledge format
ADR-0005 component identity
ADR-0006 source-of-truth/conflict model
ADR-0007 proposal lifecycle
ADR-0008 AST analysis strategy
ADR-0009 Tailwind analysis
ADR-0010 Doctor determinism boundary
ADR-0011 rule classification
ADR-0012 MCP write policy
ADR-0013 Figma integration boundary
ADR-0014 Design Contract
ADR-0015 browser evidence model
ADR-0016 convergence comparison order
ADR-0017 support evidence policy
ADR-0018 privacy/network policy
```

---

# 17. Overall Definition of Done

UI OS is not successful because the architecture is clever.

It is successful when this happens:

```text
WITHOUT UI OS

Figma
→ AI
→ code
→ human correction
→ code
→ human correction
→ code
→ human correction
→ code
→ human correction
→ approval


WITH UI OS

Figma
→ UI context
→ reuse
→ AI implementation
→ Doctor
→ Convergence
→ AI repair
→ human judgment
→ approval
```

The product's ultimate job is to remove the repetitive middle.

Not designers.

Not developers.

Not Tailwind.

Not Figma.

**The waste.**

---

# 18. Phase Summary

| Phase               | Primary Goal                        | User-visible proof                             |
| ------------------- | ----------------------------------- | ---------------------------------------------- |
| **1 — Reuse**       | Stop unnecessary UI creation        | Agent finds and reuses existing components     |
| **2 — Understand**  | Teach meaning and product patterns  | Agent knows *why* and *when* to use them       |
| **3 — Doctor**      | Enforce objective correctness       | CI can reliably reject broken UI contracts     |
| **4 — Converge**    | Reduce mechanical design correction | Figma→code requires fewer human fixes          |
| **5 — Closed Loop** | Let agents self-correct safely      | Human enters mainly for taste/product judgment |

This sequencing is intentional.

**Reuse earns understanding.
Understanding earns enforcement.
Enforcement makes convergence trustworthy.
Convergence earns autonomy.**
