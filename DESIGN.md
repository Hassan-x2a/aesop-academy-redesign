# Design

> **Note:** `/theladder/*` pages follow `design-handoff-ladder/BRAND_GUIDE.md` (4-theme system), which supersedes this file for those pages — agreed Morgan/Scott 2026-06.

## Overview

Aesop is a product interface for AI learning, assessment, certification, and evidence review. The default visual mode should feel institutional, sharp, and work-focused: clear white page foundations, dark navy work surfaces where focus matters, restrained gold for brand emphasis, and violet only as a secondary accent.

## Color System

Use this palette for Ladder and other product surfaces unless a page already has a stronger local system.

| Role | Hex | Use |
| --- | --- | --- |
| Page | `#ffffff` | Main page background |
| Ink | `#102235` | Primary text on light surfaces |
| Muted ink | `#34495d` | Secondary text on light surfaces |
| Navy panel | `#07111d` | Focus panels, app chrome, hero/product surfaces |
| Navy panel 2 | `#172331` | Secondary dark panels |
| Navy line | `#304252` | Borders on dark surfaces |
| Gold | `#dbb87a` | Brand emphasis, primary action emphasis, selected markers |
| Gold light | `#ffe7a8` | Text on dark surfaces |
| Violet | `#5b477e` | Secondary accent, certification accents |
| Violet dark | `#23183d` | Certification dark surface |
| Light panel | `#fbfaf6` | Logs and long-form reading areas |
| Light line | `#ded4c5` | Borders on light surfaces |

### Banned Color Family

Do not use aqua, teal, cyan, green-blue, or near matches as accents or panel colors. This includes the old Aesop values `#2ba898`, `#3dd6c0`, `#0b7285`, `#2f9c95`, and `#4caf82`.

## Typography

- Use the existing Aesop serif display voice only for product identity moments and major section headings.
- Use the existing UI/body font stack for controls, labels, instructional copy, transcripts, and dense panels.
- Product UI labels should be compact and legible, not oversized marketing copy.
- Avoid fluid type in dense product controls. Prefer stable sizes that do not reflow unpredictably.

## Layout

- Keep page backgrounds white unless the whole surface has a deliberate focused mode.
- Use dark work panels for high-focus product areas, not random pastel cards.
- Avoid nested card styling. If a panel contains repeated items, the items may be cards; the panel itself should not look like another floating card inside a card.
- Dense product workflows should scan vertically and horizontally without decorative dead space.
- The Ladder page should read in this order: product identity, learner/path controls, placement state, pathway rail, current rung workspace, transcript/evidence.

## Components

- Buttons: dark navy fill with gold text for primary actions on light surfaces; gold or light text on dark surfaces. Keep labels action-specific.
- Inputs and selects: consistent dark or light treatment inside a given panel. Do not mix default browser-light controls into dark cards.
- Panels: one surface language per row. Avoid unrelated pastel backgrounds next to dark panels.
- Transcript/log areas: high contrast, calm, readable, and scrollable only when necessary.
- Certification surfaces: violet can distinguish certification, but it must stay integrated with the navy/gold product system.

## Motion

Use motion only for state changes, expansion, completion, and selection feedback. Keep transitions short, 150 to 250 ms. Respect `prefers-reduced-motion`.

## Design QA Gate

Before pushing product UI changes:

1. Run `powershell -ExecutionPolicy Bypass -File scripts\impeccable-site-audit.ps1` for site-wide design review, or `scripts\impeccable-ladder-audit.ps1` for a focused Ladder check.
2. Capture desktop and mobile screenshots in light and dark mode when the page is visual.
3. Check for banned aqua/teal/cyan colors.
4. Check for light-on-light and dark-on-dark text.
5. Do a human design critique: does the page look like one product, with meaningful color and a clear next action?

Passing automated contrast is not enough. The screenshot must look coherent.
