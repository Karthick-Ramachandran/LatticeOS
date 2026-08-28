# UI OS — Business Requirements Document

**Status:** Final product baseline
**Product:** UI OS
**Category:** Open-source control plane for AI-built interfaces
**Initial ecosystem:** React · Next.js · TypeScript · Tailwind CSS
**North-star workflow:** Figma → existing design system → AI implementation → automated convergence → deterministic verification → human judgment

---

# 1. Executive Summary

UI OS is an open-source control plane that helps coding agents build interfaces using the product that already exists instead of repeatedly inventing new UI.

It sits above:

* React and Next.js;
* Tailwind CSS;
* the application's component library;
* Figma;
* Storybook;
* shadcn registries;
* browser testing tools;
* coding agents.

It does not replace them.

UI OS gives the repository enough UI intelligence to answer four questions:

### Reuse

> Do we already have something that solves this?

### Understand

> What does this component or pattern mean, and when should it be used?

### Converge

> How far is the implementation from the intended design, and what objective differences remain?

### Doctor

> Which accepted rules or objective quality requirements are violated?

The product exists to reduce the amount of human time spent correcting AI-generated frontend work.

The long-term goal is not:

> Generate UI faster.

AI already does that.

The goal is:

> **Generate less unnecessary UI, reuse more of what already exists, automatically close mechanical design differences, and ask humans only for decisions that genuinely require human judgment.**

---

# 2. Product Vision

A developer should eventually be able to point a coding agent at a Figma design and say:

> Build this.

The agent should not start from an empty universe.

UI OS should first tell it:

```text
This is a SettingsPage.

Your application already has:
- SettingsLayout
- SettingsSection
- TextField
- SaveBar
- DeleteWorkspaceSection

The Figma components map to:
- Button
- Input
- Alert
- Dialog

Rules:
- Destructive workspace operations use DeleteWorkspaceSection.
- Do not wrap every settings section in Card.
- Use the existing form-error pattern.
- Mobile settings use stacked sections.

Existing implementations:
- app/settings/profile
- app/settings/billing
```

The agent then builds.

UI OS compares what was built to:

* the intended design;
* the accepted design-system knowledge;
* the actual components available;
* the browser's rendered result.

It automatically identifies objective differences.

The coding agent fixes them.

Only after that should the human review the result.

The intended workflow becomes:

```text
               DESIGN INTENT
                    │
                    ▼
                  REUSE
                    │
                    ▼
                UNDERSTAND
                    │
                    ▼
                  BUILD
                    │
                    ▼
                CONVERGE
                    │
                    ▼
                 DOCTOR
                    │
                    ▼
              HUMAN JUDGMENT
```

Human judgment moves to the end rather than being the mechanism that drives every iteration.

---

# 3. The Problem

AI has made frontend code dramatically cheaper to produce.

That creates a new class of problems.

Coding agents routinely produce:

* duplicate components;
* near-duplicate components;
* hundreds of Tailwind utilities representing patterns already implemented elsewhere;
* slightly different spacing systems;
* inconsistent variants;
* generic dashboard patterns;
* unnecessary Cards;
* new form implementations when one already exists;
* incomplete responsive behavior;
* missing loading, empty and error states;
* inconsistent destructive-action flows;
* visually plausible implementations that are nevertheless different from the intended design.

Figma MCP improves design context.

Tailwind makes implementation fast.

Storybook improves component documentation and testing.

Component registries make reusable code available.

None of those alone answer:

> **Given this particular product, what should this agent reuse, how should the pieces fit together, what constraints apply, and how do we automatically close the remaining difference?**

That is UI OS's problem.

---

# 4. Primary Business Outcome

UI OS should reduce the human correction loop involved in AI-built interfaces.

The product's north-star metric is:

# Human Correction Turns

A Human Correction Turn is a human instruction given after an AI implementation specifically to repair or refine UI.

Examples:

```text
Use our existing table.

The spacing is wrong.

This should use the destructive dialog.

The mobile view is broken.

That isn't our Button.

The form needs an error state.

The heading should align with Figma.
```

If a normal design-to-code workflow requires:

```text
10 correction turns
```

and UI OS reduces it to:

```text
2 correction turns
```

the product has reduced correction work by 80%.

The long-term ambition is approximately 90% reduction for mechanical correction on well-instrumented design systems.

This is a measurement target, not a product guarantee.

Human taste, hierarchy decisions, product judgment and intentional design changes remain human responsibilities.

---

# 5. Product Promise

> **UI OS helps AI reuse the right UI, understand why it exists, automatically converge implementations toward their intended design, and prove objective UI requirements before asking a human to review.**

Short version:

> **Build with your design system, not around it.**

---

# 6. The Four Product Pillars

## 6.1 REUSE

The first question an agent should ask before creating reusable UI is:

> Does something equivalent already exist?

UI OS must discover:

* existing React components;
* component variants;
* patterns;
* related implementations;
* Storybook examples;
* shadcn/internal-registry components;
* repeated JSX structures;
* repeated Tailwind bundles.

Reuse reduces:

* generated code;
* duplicated UI;
* design drift;
* maintenance burden;
* future context requirements.

The product should prefer reuse without banning custom UI.

---

# 6.2 UNDERSTAND

A component API is not enough.

Knowing:

```tsx
<Button variant="destructive" />
```

does not explain:

```text
When should destructive be used?

Should it ever be the main page action?

Does deleting a workspace require entering its name?

Where do dangerous actions belong?

What existing workflow should be followed?
```

UI OS therefore stores and retrieves meaning.

Important UI entities may describe:

```text
purpose
intent
useWhen
avoidWhen
relationships
required states
allowed composition
forbidden composition
interaction expectations
responsive expectations
accessibility expectations
product-specific conventions
```

The system standardizes meaning, not appearance.

---

# 6.3 CONVERGE

Building the correct component tree is not enough.

The implementation still needs to become close to the intended design.

UI OS should compare:

```text
Design intent
       +
UI knowledge
       +
Actual browser output
```

and identify objective differences.

Convergence operates in three layers.

### Semantic

Did we use the correct components, variants, patterns and tokens?

### Structural

Are layout, dimensions, spacing, alignment, responsive behavior and overflow correct?

### Visual

Do typography, borders, shadows, colors and other rendered properties materially match the intended design?

UI OS should diagnose differences rather than merely report a screenshot percentage.

For example:

```text
Bad:
Visual difference = 14%

Useful:
SettingsContent begins 16px too high.
Mapped Button uses size="lg"; design requires size="md".
Raw destructive markup bypasses DeleteWorkspaceSection.
```

---

# 6.4 DOCTOR

Doctor answers:

> Is the objective UI contract healthy?

Doctor must be:

```text
deterministic
local-first
repeatable
CI-compatible
machine-readable
```

The same repository state must produce the same result.

Doctor should never ask an LLM:

> Is this beautiful?

That is not deterministic.

Doctor can confidently answer things such as:

```text
This accepted component reference is broken.

This deprecated component is prohibited.

This destructive operation lacks its required confirmation pattern.

This canonical component was bypassed.

This pattern requires an empty state and none exists.

This registered Figma mapping points to deleted code.

This UI context file exceeds its configured context budget.
```

The boundary between objective checks and subjective review must remain explicit.

---

# 7. Product Positioning

UI OS is not:

* a CSS framework;
* a component library;
* a Figma replacement;
* a Storybook replacement;
* a visual-regression SaaS;
* an AI website generator;
* an A2UI replacement;
* a new Tailwind syntax;
* another prompt pack.

UI OS is:

> **The control plane that makes an existing UI system usable by coding agents as a coherent system rather than a pile of disconnected assets.**

---

# 8. Why UI OS Exists Beside Current Tools

## Tailwind

Tailwind owns styling primitives and design-token-backed utilities.

UI OS uses them.

It does not invent:

```text
our-padding-lg
ui-stack
smart-flex
```

as a new styling language.

## Figma

Figma owns visual design.

Figma MCP supplies live design context.

Code Connect maps design-system components to actual code.

UI OS consumes those relationships and connects them to repository-wide meaning, reuse and validation.

## Storybook

Storybook owns stories, examples, documentation and component testing.

UI OS consumes that evidence.

## shadcn and registries

Registries own distribution/discovery of installable source code.

UI OS understands what has already been installed and how the product uses it.

## Playwright / axe

They already know how to inspect browsers and perform visual/accessibility testing.

UI OS orchestrates and interprets their output within the product's UI contract.

---

# 9. Product Principles

## 9.1 Reuse before generation

Do not create another abstraction if the repository already has the right one.

## 9.2 Custom UI always remains possible

UI OS must never become Bootstrap-with-AI.

A developer can always build something completely novel.

## 9.3 Repetition earns abstraction

One unusual UI implementation is not necessarily a component.

Six equivalent implementations probably deserve attention.

## 9.4 Tailwind remains visible

Developers may continue using raw Tailwind.

UI OS reduces repetition by encouraging appropriate reuse rather than hiding Tailwind behind another language.

## 9.5 Repository-owned truth

Accepted rules live with the code.

## 9.6 Inference proposes

Inference never silently becomes product truth.

## 9.7 Human decisions remain human

AI may recommend.

Humans accept important conventions.

## 9.8 Deterministic gates remain deterministic

Higher-order visual judgment belongs to the agent/human review layer.

## 9.9 Context stays small

The agent receives the relevant 10 components, not all 900.

## 9.10 No process tax for trivial work

A one-off decorative layout does not require a design ADR.

UI OS should progressively apply discipline as reuse and impact increase.

---

# 10. Product Phases

The five phases intentionally build on one another.

```text
PHASE 1       PHASE 2       PHASE 3       PHASE 4       PHASE 5

REUSE    →   UNDERSTAND →    DOCTOR   →   CONVERGE  →   CLOSED LOOP
```

The other pillars continue maturing in every phase.

---

# 11. Phase 1 — Reuse Foundation

## Objective

Produce immediate value in an ordinary React/Next.js/Tailwind repository without requiring Figma, Storybook or custom metadata.

The product must prove:

> UI OS can reduce unnecessary frontend generation before we attempt anything more intelligent.

## User outcome

A developer installs UI OS and can immediately ask:

```text
What components already exist for this?

Where do we already implement empty states?

Are these Tailwind structures duplicated?
```

## Required capabilities

* project detection;
* React component indexing;
* import/usage graph;
* TypeScript prop extraction;
* Tailwind theme discovery;
* normalized class analysis;
* shadcn detection;
* optional Storybook detection;
* component search;
* usage search;
* exact reuse recommendations;
* repeated Tailwind detection;
* compact agent context.

## Exit condition

UI OS must measurably increase reuse on controlled React tasks before Phase 2 becomes the focus.

---

# 12. Phase 2 — Understand

## Objective

Turn a component inventory into a product vocabulary.

## User outcome

Instead of only knowing:

```text
DeleteWorkspaceSection exists.
```

the agent understands:

```text
DeleteWorkspaceSection represents irreversible workspace deletion.

Use when deleting an entire workspace.

Do not use for deleting individual records.

Requires:
confirmation
workspace-name verification

Belongs:
last in workspace settings
```

## Required capabilities

* semantic component schema;
* pattern schema;
* rule schema;
* convention vocabulary;
* lessons;
* useWhen / avoidWhen;
* source relationships;
* proposed → accepted lifecycle;
* Figma Code Connect references;
* Storybook evidence;
* task-specific semantic retrieval.

## Exit condition

An agent should be able to choose between semantically similar components more accurately because UI OS explains why they exist.

---

# 13. Phase 3 — Doctor

## Objective

Make accepted UI knowledge enforceable.

## User outcome

The repository can answer:

```bash
ui doctor
```

and receive reliable objective findings.

## Required capabilities

* versioned rule engine;
* stable finding IDs;
* error/warn/info;
* JSON output;
* CI exit codes;
* broken-reference detection;
* deprecation checks;
* accepted composition rules;
* canonical-component bypass checks;
* state requirements;
* configured token rules;
* automated accessibility adapters;
* context-budget checks;
* rule suppressions with explicit rationale.

## Exit condition

Teams must be willing to put Doctor in CI.

That requires extremely low hard-error false positives.

---

# 14. Phase 4 — Converge

## Objective

Reduce the mechanical Figma → code correction loop.

## User outcome

After an agent builds a design, UI OS can produce:

```text
Semantic
✓ canonical components
✗ Button variant mismatch

Structural
✗ content starts 12px too high
✗ mobile column overflow

Visual
✗ heading line-height differs
✓ background
✓ border radius

Accessibility
✓ automated checks
```

## Required capabilities

* Figma design-contract capture;
* Code Connect enrichment;
* browser-state capture;
* viewport profiles;
* DOM layout measurement;
* computed-style measurement;
* screenshot comparison;
* responsive comparison;
* design-node ↔ implementation mapping;
* convergence report;
* confidence classification;
* stabilization of fonts, animation and dynamic content.

## Exit condition

Convergence must reduce human correction turns on benchmark designs.

A prettier report is not sufficient.

---

# 15. Phase 5 — Autonomous Convergence Loop

## Objective

Allow coding agents to use the four pillars as a bounded self-correction loop.

## Workflow

```text
Agent receives task
       ↓
UI OS context
       ↓
Reuse
       ↓
Build
       ↓
Doctor
       ↓
Converge
       ↓
Machine-readable findings
       ↓
Agent repairs
       ↓
Doctor + Converge
       ↓
Stop condition
       ↓
Human review
```

## Required safeguards

The loop must have:

* maximum iterations;
* improvement thresholds;
* hard stop conditions;
* prevention of pixel-chasing hacks;
* semantic requirements that outweigh screenshot similarity;
* human escalation;
* complete repair history.

## Exit condition

For a benchmark of realistic product screens, UI OS materially reduces human correction turns without degrading implementation quality.

---

# 16. North-Star Metrics

## Human Correction Turns

Primary product metric.

## Existing Component Reuse Rate

When an appropriate canonical component exists, how often does the agent use it?

## Duplicate UI Creation Rate

How often does an AI task introduce an unnecessary equivalent implementation?

## Convergence Before Human Review

How many objective differences remain at first human review?

## Doctor Precision

Hard-error false-positive rate must remain extremely low.

## Context Efficiency

How much UI OS context is consumed per task?

## Time to First Value

A developer should get meaningful Reuse information within minutes of installation.

---

# 17. Long-Term Targets

These are direction-setting targets, not launch promises.

For mature, well-instrumented repositories:

* > 80% canonical reuse when an exact appropriate component exists;
* substantial reduction in newly duplicated Tailwind structures;
* > 70% reduction in mechanical correction turns;
* stretch goal approaching 90% on suitable Figma-to-code workflows;
* near-zero hard-gate false positives;
* task-specific context substantially smaller than full design-system documentation.

---

# 18. Unacceptable Product Outcomes

UI OS has failed if developers say:

> I spend more time feeding UI OS than it saves me.

It has also failed if:

* components must be rewritten to participate;
* every small component needs metadata;
* developers must learn a second styling language;
* Figma information is duplicated manually;
* agent context becomes enormous;
* Doctor becomes an AI opinion machine;
* convergence encourages `margin-left: 1.37px` screenshot hacks;
* UI OS becomes mandatory production runtime code;
* existing design tools become harder to use;
* the system encourages conformity over deliberate custom design.

---

# 19. Business Recommendation

UI OS should be built as five increasingly valuable layers rather than attempting the final autonomous vision immediately.

The critical strategic ordering is:

> **Reuse first.**

If UI OS cannot reliably tell an agent:

> We already have this.

then semantic reasoning and visual convergence are being built on the wrong foundation.

Once Reuse works:

> Understand why.

Once understanding works:

> Enforce the objective parts.

Once those work:

> Converge to design.

Only then:

> Let the agent self-correct.

The product should earn autonomy rather than starting with it.
