---
name: crewi
description: Short browser games for the video call your remote team is already on.
colors:
  call: "#15171c"
  panel: "#1f2229"
  panel-2: "#2a2e37"
  ink: "#f4f2ec"
  mute: "#a9adb8"
  lemon: "#ffd23f"
  cobalt: "#3157e6"
  tomato: "#e5533a"
  teal: "#139c80"
  lilac: "#7d5ff0"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, sans-serif"
    fontSize: "clamp(3rem, 3rem + 1.5vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.25rem, 2rem + 1.5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body-lead:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
rounded:
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
spacing:
  gutter: "8px"
  sm: "12px"
  md: "24px"
  lg: "40px"
  section: "128px"
components:
  button-primary:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.call}"
    typography: "{typography.body-lead}"
    rounded: "{rounded.full}"
    padding: "16px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "16px 20px"
  button-ghost-hover:
    backgroundColor: "{colors.panel-2}"
  control-bar:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "6px"
  participant-tile:
    backgroundColor: "{colors.cobalt}"
    rounded: "{rounded.xl}"
  name-tag:
    backgroundColor: "rgb(0 0 0 / 0.55)"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  panel-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "40px"
  chip:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  chip-scored:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.call}"
---

# Design System: crewi

## Overview

**Creative North Star: "The Call Already in Progress"**

crewi looks like the video call its players are already sitting in. The ground is a graphite call background; every section is something a call app would show: a grid of camera-off tiles, a presenter's shared screen, the chat side panel, a floating pill control bar, the "call ended" screen. Content lives inside those shapes, never beside them as chrome. The world is dark, flat and saturated: tiles are solid color fields with a centered emoji avatar, and a single lemon yellow marks whatever is live (the active speaker, the action, the focus).

Density is relaxed and tile-driven. Panels sit on an 8px call-grid gutter with generous interior padding, and the page scrolls through large rounded panels separated by wide vertical air. Type pairs a heavy, tightly tracked grotesque for statements with a friendly humanist sans for everything spoken or clicked. Motion is small and meaningful: the speaker ring hops between tiles and each caption line settles in with a short expo ease; with reduced motion the ring rests on the presenter and nothing moves.

The world refuses the category default for SaaS landings: no gradient hero, no product screenshot mockup, no row of three icon cards. If a surface cannot be read as a tile, panel or state of a call, it does not belong here.

**Key Characteristics:**
- Graphite call ground with two lifted panel tones; no light mode.
- Camera-off tiles as flat saturated fields (cobalt, tomato, teal, lilac) with centered emoji avatars.
- One lemon accent for the active speaker, primary action, focus ring, selection and numerals.
- Pills for every control and tag; large soft corners for tiles and panels.
- Name tags bottom-left on a translucent black pill, exactly as a call app places them.
- Tabular digits for party codes, clocks, votes and points.

## Colors

A graphite night-call palette: three near-neutral cool greys, a warm off-white ink, one lemon signal and four saturated tile fields.

### Primary
- **Speaker Lemon** (lemon): the one live signal. Primary buttons ("Crear party"), the inset active-speaker ring, the speaking-bars badge, focus outlines, text selection, step numerals, the caption speaker name, vote bars, the "Con puntos" chip and small in-panel icons. Text on lemon is always Call Graphite.

### Secondary
- **Tile Cobalt** (cobalt), **Tile Tomato** (tomato), **Tile Teal** (teal), **Tile Lilac** (lilac): camera-off participant fields and avatar discs. They are identity colors for people, not UI states. Tomato doubles as the red "presenting" dot and the error toast; cobalt and teal also paint water and parks in the illustrated map.

### Neutral
- **Call Graphite** (call): the page ground, the inner stage of shared-screen demos, and the text color on lemon.
- **Panel Slate** (panel): first lift. Presenter tile, section panels, control bar, chat bubbles.
- **Panel Slate Raised** (panel-2): second lift. Participant tiles without a color, chips, the screen-share title strip, chat panel, ghost-button hover, track of progress bars.
- **Warm Ink** (ink): primary text; slightly warm so it reads as paper light, not pure white.
- **Muted Steel** (mute): secondary text, supporting paragraphs, metadata, inactive icons. Holds about 6:1 on Panel Slate Raised.

### Named Rules
**The One Live Signal Rule.** Lemon means "this is live or this is the action." It never fills a participant tile, never decorates, and never appears as body text color outside a speaker name or a numeral.

**The Tiles Are People Rule.** Cobalt, tomato, teal and lilac belong to participants. Do not use them for buttons, links or section backgrounds.

## Typography

**Display Font:** Bricolage Grotesque Variable (with ui-sans-serif, sans-serif)
**Body Font:** Figtree Variable (with ui-sans-serif, system-ui, sans-serif)

**Character:** Bricolage at weight 800 with tight negative tracking gives statements a chunky, poster-like voice; Figtree keeps captions, chat and controls round and conversational. Both are self-hosted through @fontsource-variable.

### Hierarchy
- **Display** (800, 3rem to 4.5rem across breakpoints, 0.95, -0.03em): the hero statement only, capped near 14ch and balanced.
- **Headline** (800, 2.25rem to 3.75rem, 1, -0.03em): section statements, balanced, capped near 18ch when centered.
- **Title** (800, 1.875rem, -0.02em): game names inside screen-share panels. Weight 700 at 1.5rem for a question inside a demo stage.
- **Body lead** (400, 1.125rem to 1.25rem): supporting paragraphs in Muted Steel, capped at 46ch to 54ch.
- **Body** (400, 1rem; 15px in chat and captions on mobile): chat messages, rejoin card, list rows.
- **Label** (500 to 600, 0.875rem; 0.75rem inside small tiles): name tags, chips, control-bar links, metadata.
- **Numerals** (tabular-nums everywhere a digit can change: clock, party code, votes, points, step numbers).

### Named Rules
**The Heavy Statement Rule.** Every display and headline line is Bricolage at 800 with negative tracking. Figtree is never set larger than 1.25rem.

## Layout

The first viewport is a call grid: on desktop a four-column, three-row grid filling the viewport minus the top bar and control bar (minimum 560px tall), the presenter tile spanning two columns and all three rows, six participant tiles in a 2 by 3 block. On mobile the presenter tile stacks on top, a caption line sits between, and tiles fall into a 3-column grid at 4:3. Tiles in the grid are separated by an 8px gutter, as in a call app.

Below the grid, sections are contained at 1152px with 16px (mobile) to 24px side padding and 112px to 128px of top spacing between sections. Panels use 24px interior padding on mobile and 32px to 40px on larger screens. Two-part panels split into text and a fixed-width side column (a 380px chat panel; a 5:7 copy-to-demo split in screen-share panels) from the md or lg breakpoint.

Navigation is a fixed, centered pill control bar 16px from the bottom; the page reserves 112px of bottom padding so the last content clears it. On small screens control links collapse to icon-only with an accessible label.

## Elevation & Depth

Depth is tonal. Call Graphite, Panel Slate and Panel Slate Raised stack as three lifts, and in-panel stages drop back to Call Graphite to read as a shared screen. Surfaces at rest have no shadow. Shadows are reserved for elements that float above the call: the control bar, the rejoin card and the error toast.

### Shadow Vocabulary
- **Floating control** (`box-shadow: 0 12px 32px rgb(0 0 0 / 0.5)`): control bar; the rejoin card uses the same shape at 0.45 alpha.
- **Speaker ring** (`box-shadow: inset 0 0 0 4px var(--color-lemon)`): the active-speaker state on a tile; transitions over 300ms as it hops. Not a depth cue.

### Named Rules
**The Flat Call Rule.** Tiles and panels never cast shadows. Only things that float over the call get the soft floating shadow.

## Shapes

Soft, generous corners throughout, with pills for anything you press or read as a tag. Tiles and in-grid panels are 16px; page-scale section panels are 24px; demo stages inside panels are 12px; chat link bubbles are 8px. Buttons, chips, name tags, control bar, avatar discs and the speaking badge are fully round. Avatar stacks overlap with a 4px ring in the panel color. Borders are nearly absent: the only lines are a hairline divider in a panel tone inside the chat header and between result rows.

## Components

### Buttons
Round, bold and yellow when they act; quiet when they navigate.
- **Shape:** full pill (9999px).
- **Primary:** Speaker Lemon fill, Call Graphite text, bold, a 2.5-stroke plus icon leading; 16px by 28px at hero scale, 10px by 20px inside the control bar.
- **Hover / Focus:** fill drops to 85% lemon over 200ms; focus is a 2px lemon outline offset 3px; disabled at 60% opacity, label switches to "Creando…".
- **Ghost:** transparent with Warm Ink (or Muted Steel for a secondary exit), filled with a panel tone on hover.

### Chips
- **Style:** pill, Panel Slate Raised fill, Warm Ink label at 0.875rem medium or semibold.
- **State:** the scored variant flips to lemon fill with graphite text; unscored stays neutral.

### Cards / Containers
- **Corner Style:** 16px in the grid and for screen-share articles, 24px for section panels.
- **Background:** Panel Slate; nested stages in Call Graphite; side panels in Panel Slate Raised.
- **Shadow Strategy:** none (see The Flat Call Rule).
- **Border:** none.
- **Internal Padding:** 24px mobile, 32px to 40px desktop; centered closing panels use 64px to 96px vertical.

### Navigation
- **Control bar:** fixed bottom-center pill in Panel Slate with 6px inner padding and the floating shadow. Links are pill-shaped, 0.875rem medium Warm Ink with a 20px Lucide icon, Panel Slate Raised on hover; icon-only below the sm breakpoint. The primary Crear party button closes the bar.
- **Top bar:** 56px tall, lowercase "crewi" wordmark in Bricolage 800 left, a Muted Steel clock and meeting title right.

### Participant Tile (signature)
A camera-off tile: flat Tile color or Panel Slate Raised field, 16px corners, a centered emoji in a 20% black disc, and a name tag bottom-left (translucent black pill, white 0.75rem to 0.875rem medium label, mic or muted-mic icon). When speaking, the tile gets the inset lemon ring and a lemon speaking badge top-right with three graphite bars pulsing on a 700ms ease-in-out loop, staggered.

### Screen Share Panel (signature)
A Panel Slate article with a Panel Slate Raised title strip ("[name] está presentando", tomato dot, Muted Steel label), then copy and a Call Graphite demo stage. Game demos render inside it as the shared screen.

### Speaker Caption
A centered line under the grid: speaker name in semibold lemon, the line in Warm Ink. Each new line enters over 400ms on the expo-out curve from 35% opacity, 4px down and a 2px blur.

## Do's and Don'ts

### Do:
- **Do** frame every new surface as a state of the call: tile, panel, chat, shared screen, control bar or call-ended screen.
- **Do** keep lemon as the single live signal: primary action, active speaker, focus outline, selection, numerals.
- **Do** put people's identity in the tile colors and emoji avatars, and name tags bottom-left on a translucent black pill.
- **Do** use tabular digits for codes, clocks, votes and points.
- **Do** set statements in Bricolage 800 with negative tracking and balanced wrapping.
- **Do** stop the speaker hop, captions and speaking bars under prefers-reduced-motion, resting the ring on the presenter.
- **Do** use Lucide icons at one stroke weight; the plus on primary buttons is the only heavier stroke (2.5).

### Don't:
- **Don't** use gradient heroes, product screenshot mockups or rows of three icon cards; the world refused them.
- **Don't** fill a participant tile, section or button with lemon, or use tile colors for controls.
- **Don't** add shadows to tiles or panels; only floating elements get the floating shadow.
- **Don't** introduce a light theme or the stone/neutral light surfaces from the older lobby and game screens.
- **Don't** set white text directly on a tile color; text over a tile sits on the translucent black name-tag pill.
