# MYSHIFT Design System

Operational console for multi-branch F&B shift management. Source of truth for every
color, type size, spacing value, radius, and component pattern.

**Provenance.** `PLAN/atlassian-DESIGN.md` is the upstream source and wins on styling.
`PLAN/kerangka-ui/extracted/atlassian/DESIGN.md` supplies the full Atlassian token ramp
(surface containers, outline, secondary, error) that the plan file's 7 colors omit. This
file is the MYSHIFT realization: which tokens we adopt, how they compose, and which
patterns are reusable. The prototype HTML under `PLAN/kerangka-ui/extracted/` is
**not** a styling source per `AGENTS.md` its inline palettes (`#0075de`, shadcn/zinc)
are not adopted here.

When code needs a token not listed here, add it here first.

## 1. Atmosphere & Identity

A quiet operations console. Dense where a manager compares rows, spacious where a shift
worker reads one card on a phone. It should look like a tool that has been in service for
years: nothing decorative, every surface earning its place.

The signature is **ink weight**. Hierarchy comes from near-black text at varying weight
against a warm off-white ground, not from saturation. The navy accent is reserved for the
single most likely action on a screen. Data uses tabular numerals so columns of times and
counts align down the page without the reader tracking digits.

Anti-goals: no emoji as iconography, no saturated blue marketing surfaces, no
accent-colored borders used to mark state, no motion that does not report a change.

## 2. Color

Light mode is primary. Dark mode exists but is secondary field staff use phones in
daylight. Both are defined; neither inverts sections.

### Palette light

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Ground | `--background` | `#f8f8f8` | Page background (warm off-white) |
| Panel | `--card` | `#ffffff` | Cards, tables, sheets |
| Panel/sunken | `--muted` | `#f4f3f8` | Table heads, inset blocks |
| Panel/raised | `--popover` | `#ffffff` | Popovers, modals |
| Hairline | `--border` | `#c5c6ca` | Card and table outlines (`outline-variant`) |
| Hairline/strong | `--input` | `#75777a` | Inputs, interactive borders (`outline`) |
| Text | `--foreground` | `#1a1b1f` | Headings, body (`on-surface`) |
| Text/secondary | `--muted-foreground` | `#45474a` | Labels, metadata (`on-surface-variant`) |
| Text/tertiary | `--subtle-foreground` | `#5d5e61` | Disabled, placeholder (`surface-tint`) |
| Accent | `--primary` | `#1c2b42` | Primary action, active nav, links (navy) |
| Accent/on | `--primary-foreground` | `#ffffff` | Text on accent fill |
| Accent/wash | `--accent` | `#e9e7ed` | Selected row, info panel (`surface-container-high`) |
| Accent/wash-ink | `--accent-foreground` | `#1c2b42` | Text inside accent wash |
| Info/wash | `--info-wash` | `#d1e0ff` | Informational panel (`secondary-container`) |
| Info/ink | `--info-foreground` | `#54637d` | Text inside info wash |
| Danger | `--destructive` | `#ba1a1a` | Rejected, delete, error (`error`) |
| Danger/wash | `--destructive-wash` | `#ffdad6` | Rejected badge ground (`error-container`) |
| Danger/ink | `--destructive-foreground` | `#93000a` | Text inside danger wash |
| Inverse surface | `--inverse-surface` | `#2f3034` | Landing hero, dark CTA band |
| Inverse on-surface | `--inverse-foreground` | `#f1f0f5` | Text on inverse surface |

### Palette dark

| Role | Token | Value |
|------|-------|-------|
| Ground | `--background` | `#1a1b1f` |
| Panel | `--card` | `#232528` |
| Panel/sunken | `--muted` | `#2f3034` |
| Hairline | `--border` | `#3a3b40` |
| Text | `--foreground` | `#f1f0f5` |
| Text/secondary | `--muted-foreground` | `#c5c6ca` |
| Accent | `--primary` | `#9db8dc` |
| Accent/on | `--primary-foreground` | `#10161f` |
| Danger | `--destructive` | `#f2b8b5` |

### Status colors (component-level addition)

The upstream token file ships no green or amber its rationale states status colors are
"added at component level". These three are therefore MYSHIFT additions, defined here so
they are not invented in components:

| Role | Token | Light | Dark |
|------|-------|-------|------|
| Success | `--success` | `#1a7f4b` | `#5fd39a` |
| Success/wash | `--success-wash` | `#e6f4ec` | `#16261d` |
| Warning | `--warning` | `#8a5a00` | `#e0a83c` |
| Warning/wash | `--warning-wash` | `#fbf3e3` | `#2b2314` |

### Rules

- Accent marks the single most likely action on a screen. Peer actions differ by weight
  and border, never by color. Nothing decorative carries accent.
- Status is always a **wash ground plus status-ink text**, never a saturated solid fill.
  Solid fill is reserved for the primary action and the inverse surface.
- Contrast, verified against `--background` `#f8f8f8`:
  `#1a1b1f` ≈ 15.9:1, `#45474a` ≈ 8.9:1, `#5d5e61` ≈ 6.1:1, `#1c2b42` ≈ 13.4:1,
  `#93000a` on `#ffdad6` ≈ 8.5:1, `#54637d` on `#d1e0ff` ≈ 6.4:1. All clear AA; body text
  clears AAA.
- No pure `#000000` for page ground or text. Use `--background` and `--foreground`.
- Never introduce a color absent from these tables. Extend the table first.

## 3. Typography

### Scale

The upstream file ships two scales: a 40/32/20px Charlie stack for marketing, and a full
product ramp. MYSHIFT uses the **product ramp** it is sized for an app console.

| Level | Tailwind | Size | Weight | Line height | Tracking | Usage |
|-------|----------|------|--------|-------------|----------|-------|
| Display | `text-4xl` | 36px | 700 | 1.15 | -0.02em | Landing hero, 404 numeral |
| H1 | `text-2xl` | 24px | 700 | 1.2 | -0.015em | Page title |
| H2 | `text-lg` | 18px | 600 | 1.3 | -0.01em | Card title, section head |
| H3 | `text-base` | 16px | 600 | 1.4 | 0 | Row heading, form group |
| Body | `text-sm` | 14px | 400 | 1.5 | 0 | Default text, table cells |
| Body/sm | `text-xs` | 13px | 400 | 1.45 | 0 | Secondary detail |
| Caption | `text-xs` | 12px | 500 | 1.4 | 0.01em | Labels, metadata, timestamps |
| Overline | `text-[11px]` | 11px | 600 | 1.3 | 0.08em | Section labels, uppercase |

### Font stack

- Primary: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, sans-serif`
- The upstream file specifies Charlie Display / Charlie Text. Charlie is a licensed font
  unavailable to this project, and its own fallback chain is the system stack above, so
  adopting the fallback loses nothing and avoids a webfont request.
- Mono / numeric: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` with
  `font-variant-numeric: tabular-nums` for all times, counts, and IDs.

### Rules

- Body text never below 12px; interactive labels never below 13px.
- Max 2 font families. No webfont download.
- Headings use `text-wrap: balance`; body copy `text-wrap: pretty`.
- Sentence case for all headings. Never title case.

## 4. Spacing & Layout

Base unit 4px, per the upstream `spacing.base`.

| Step | Value | Usage |
|------|-------|-------|
| 1 | 4px | Icon-to-label |
| 2 | 8px | Inline cluster, list gap |
| 3 | 12px | Form field gap, card inner |
| 4 | 16px | Card padding, gutter |
| 5 | 20px | Control height the 44px touch floor |
| 6 | 24px | Section inner padding |
| 8 | 32px | Between card groups |
| 10 | 40px | Page section rhythm |
| 12 | 48px | Major section break |

### Grid

- Max content width: 1200px (app shell), 640px (single-column forms).
- Page margin: 16px mobile, 24px desktop.
- Breakpoints: sm 640, md 768, lg 1024, xl 1280.

### Layout primitives

- **scroll-body-shell** fixed header, scrolling body, `max-block-size: 100dvb`, and
  `min-block-size: 0` on the scroll child so the body actually scrolls. Never `100vh`.
- **stack** vertical rhythm between siblings, `gap` only, no margin soup.
- **cluster** wrapping row of controls, `flex-wrap: wrap` + `gap`.
- **switcher** N equal regions, row when roomy, stack when tight, no breakpoint.
- **sidebar** admin console rail at `lg`+, collapsing to a sheet below.
- **content-limiter** form measure capped at 640px.
- **intrinsic grid** `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`. The inner
  `min()` is load-bearing: it stops horizontal overflow when the container is narrower
  than the track floor.

### Rules

- Every interactive control is at least 40px tall; primary actions 44px.
- `min-h-[100dvh]`, never `min-h-screen`, for full-height regions.
- Long unbroken strings (IDs, spreadsheet IDs) get `overflow-wrap: anywhere` and
  `min-inline-size: 0`.

## 5. Components

Primitives used two or more times. Class maps live in `lib/ui.ts`; components in
`components/ui/`.

### `controlClass`
- **Structure**: input / select / textarea shell
- **Variants**: default; error and disabled via data attributes
- **Spacing**: `h-11` touch floor, `px-4`
- **States**: rest, hover, focus-visible ring, disabled, invalid
- **Accessibility**: caller supplies `aria-label` when no visible `<Label>`
- **Motion**: color only, 150ms
- **Layout**: block, `w-full`, `min-inline-size: 0`

### `cardClass`
- **Structure**: single surface block
- **Variants**: default, conflict (danger wash, for schedule collisions)
- **Spacing**: `p-4`
- **States**: rest; hover only when the card is itself a link or button
- **Accessibility**: `focus-within` ring when it contains controls
- **Motion**: none
- **Layout**: stack

### `tableWrapClass` / `tableClass` / `thClass` / `tdClass`
- **Structure**: scroll container → table → head row → body rows
- **Variants**: default
- **Spacing**: `p-3` cells, `border-t` row separators
- **States**: rest, hover row (`--muted`), selected (`--accent` wash)
- **Accessibility**: `<th scope="col">`; wrapper owns `overflow-x: auto`
- **Motion**: none
- **Layout**: scroll owner is the wrapper

### `StatusBadge`
- **Structure**: inline span, wash ground + status-ink text
- **Variants**: success (approved/active), warning (pending), danger (rejected), neutral
- **Spacing**: `px-2 py-0.5`, `text-xs`
- **States**: rest, no hover
- **Accessibility**: color is never the sole signal the status word is always rendered
- **Motion**: none
- **Layout**: inline

### `Button`
- **Variants**: `default` (accent fill), `outline`, `ghost`, `destructive`, `link`
- **Sizes**: `default` (h-10), `sm` (h-8, secondary contexts), `icon` (h-10 w-10)
- **States**: rest, hover, active (`translate-y-px`), focus-visible ring, disabled
- **Accessibility**: real `<button>`; `asChild` for links. Icon buttons carry
  `aria-label` and never contain ambiguous text
- **Motion**: transform + color only, 150ms

### `Input` / `Select` / `Textarea`
- **Variants**: default, invalid
- **States**: rest, focus-visible ring, disabled, invalid
- **Accessibility**: `<select>` stays native for the OS option sheet and correct
  screen-reader behavior
- **Layout**: block, full width

### `EmptyState`
- **Structure**: dashed inset block, icon, title, description, optional action
- **Variants**: default
- **States**: is itself a state
- **Accessibility**: `h3` under the page `h1`
- **Layout**: centered stack, `py-16`

### `PageHeader`
- **Structure**: `h1` plus optional supporting line and actions cluster
- **Variants**: default
- **Spacing**: `mb-6`; actions in a `cluster`
- **Motion**: opacity/translate entrance only, 400ms

### `AppShell` (admin) and `PetugasShell` (employee)
- **Structure**: scroll-body-shell header, main, and either a console rail or a bottom
  nav
- **Variants**: admin, employee
- **Spacing**: page padding 20px, content max 1200px
- **States**: n/a
- **Accessibility**: `<header>`, `<main>`, `<nav>` landmarks; skip link targets `#main`
- **Motion**: header entrance 400ms
- **Layout**: scroll owner is `main`, with `min-block-size: 0`

## 6. Motion & Interaction

The upstream frontmatter gives 250/500/750ms `ease-in-out`; its rationale text gives the
measured 75/400/500ms with a `cubic-bezier(0.4, 0, 0, 1)` ease-out. This contract takes
the rationale values they are the measured ones and fit an app console.

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 75ms | ease-out | Button press, color change |
| Standard | 250ms | `cubic-bezier(0.4, 0, 0, 1)` | Sheet, panel, tab switch |
| Emphasis | 400ms | `cubic-bezier(0.4, 0, 0, 1)` | Page and section entrance |

### Rules

- Only animate `transform` and `opacity`. Never `width`, `height`, `top`, `left`.
- No `whileHover` scale on text, table cells, or static content. Hover scale belongs only
  on a card that is itself a link or button.
- No perpetual loops. A live-data indicator animates only while data is refreshing.
- `prefers-reduced-motion: reduce` collapses entrance and positional motion to a
  cross-fade; progress and state indicators remain.
- Scroll-triggered animation uses `IntersectionObserver` or Motion `whileInView`, never a
  scroll listener.

## 7. Depth & Surface

**Strategy: borders-only, with one subtle elevation level for overlays.**

The upstream rationale records that layered shadows are nearly invisible and cards are
separated by whitespace and color. Shadow is therefore reserved for genuinely floating
layers.

| Type | Value | Usage |
|------|-------|-------|
| Hairline | `1px solid var(--border)` | Cards, tables, list rows |
| Hairline/strong | `1px solid var(--input)` | Inputs, interactive surfaces |
| Elevation/overlay | `0 8px 24px rgba(16,18,20,0.12)` | Popover, sheet, modal only |

### Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 3px | Chips, badges, checkbox |
| `--radius-md` | 4px | Buttons, inputs, selects |
| `--radius-lg` | 8px | Cards, panels |
| `--radius-xl` | 24px | Sheets, modals |
| `--radius-full` | 9999px | Pills, avatars |

### Rules

- Nested corners are concentric: inner radius is outer radius minus the padding between
  them.
- No decorative shadow on cards, tables, or list rows. Border and background carry
  separation; elevation is for floating overlays only.
- Shadows tint toward `--foreground`, never pure black.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA. Contrast floor 4.5:1 body, 3:1 large text. Verified ratios are in
  Section 2.
- A visible `focus-visible` ring on every interactive element. This is the only permitted
  colored edge no accent-colored borders marking selected or focused state.
- Full keyboard reachability. Every `<label>` bound to its control, or an equivalent
  `aria-label` present.
- Icon-only buttons carry `aria-label`. Text is never placed in an icon-sized hit area.
- No emoji as iconography in any product or marketing surface.
- Touch targets: 40px minimum, 44px for primary actions on touch surfaces.
- `prefers-reduced-motion` respected per Section 6.
- Focus indicator: 2px outline, 2px offset, visible on all keyboard-navigable elements.

### Accepted debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| `phase1.tsx` / `phase2.tsx` remain large client modules | `components/phase1.tsx`, `components/phase2.tsx` | Splitting per screen is a refactor beyond the UI repair scope; screens now route through the shared shell and token class maps | Split per screen when a screen gains independent state |
| Landing page keeps a marketing layout distinct from the app shell | `app/page.tsx` | It is a pre-auth marketing surface, not one of the 21 `UI-PLAN.md` app screens; aligning it to tokens is required, aligning it to the app shell is not | Revisit if a landing redesign is commissioned |
