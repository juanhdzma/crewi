---
name: crewi
description: Short browser games for the video call your remote team is already on.
colors:
  call: "#0e1427"
  panel: "#172039"
  panel-2: "#222d4e"
  ink: "#eef1fb"
  mute: "#9aa5c7"
  accent: "#ff7a59"
  accent-ink: "#ff8c6e"
  on-accent: "#15171c"
  danger: "#e5533a"
  ok: "#2fbf8f"
  person: ["#a9bdff", "#ffb8a8", "#93dcc8", "#cbbcff", "#ffd9a3", "#f7adcb", "#abdcf5", "#cadd9e"]
colors-light:
  call: "#f4f2ec"
  panel: "#ffffff"
  panel-2: "#e9e6de"
  ink: "#1b1c20"
  mute: "#5f636c"
  accent-ink: "#b8431f"
  ok: "#15803d"
typography:
  family: "Outfit Variable, ui-sans-serif, system-ui, sans-serif"
  display:
    fontSize: "clamp(3rem, 3rem + 1.5vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontSize: "clamp(2.25rem, 2rem + 1.5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontSize: "1.5rem to 1.875rem"
    fontWeight: 800
    letterSpacing: "-0.02em"
  body:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    shadow: "0 4px 0 accent mixed 55% with black (pressable)"
  button-secondary:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  button-exit:
    border: "2px {colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
  host-chip:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    label: "Anfitrión"
---

# Design System: crewi

## Overview

**Creative North Star: "The Call Already in Progress"**

crewi lives next to the video call the team is already on. Surfaces borrow the language of a call app (participant avatars, a room header with the code and who is in, a people panel, a screen-share strip) but the game itself takes the stage: question cards, a map, a podium. The world is flat and tonal, with one coral signal for whatever you can act on, and soft pastel colors that identify people.

The theme follows the system, dark or light, and a sun/moon toggle stores the choice per browser. Both themes share every token name; only the values change.

Motion is expressive but short: cards rise, avatars pop, podium steps grow, confetti falls on the final result. Everything stops under `prefers-reduced-motion`.

**Key Characteristics:**
- Midnight navy ground with two lifted panel tones in dark; warm paper tones in light.
- One coral accent for primary actions, the current step, selection and the host chip.
- Eight pastel person colors, assigned from the player id, behind avatars, photos and map pins.
- Pills for every button; pressable primary buttons with a short bottom edge.
- Outfit for everything; heavy weights and tight tracking for statements.
- Tabular digits for codes, votes, distances and points; numbers use es-CO format (5.000, 3,1 km).

## Colors

### Accent
- **Coral** (accent): primary buttons, current progress dot, selected vote card, the question card, the host chip, podium first step. Text on coral is always `on-accent`.
- **Coral ink** (accent-ink): coral used as text or thin strokes (exit button, "su turno", hints label). Darker in light theme to keep contrast.

### People
- **Person colors** (p0 to p7): the background behind a player's photo or emoji, everywhere that player appears. They identify people; never use them for controls or states.

### Neutral
- **Call** (call): page ground and inset wells (inputs, the agenda in the hero card).
- **Panel** (panel): first lift. Room header, cards, people panel, tables.
- **Panel raised** (panel-2): second lift. Secondary buttons, chips, progress tracks.
- **Ink / Mute**: primary and secondary text.

### Status
- **Danger** (danger): action errors next to the action, rank drops.
- **OK** (ok): "listo", confirmations, copied link, rank gains.

### Named Rules
**The One Signal Rule.** Coral means "this is the action or where you are". Do not use it as decoration.

**The Exit Is An Outline Rule.** Leaving the party uses the coral outline, never a filled coral button, so it cannot be mistaken for the primary action.

## Typography

**Family:** Outfit Variable, self-hosted through `@fontsource-variable/outfit`.

- **Display** (800, tight tracking): the home statement only.
- **Headline** (800): section statements and game screen titles.
- **Title** (800, 1.5rem to 1.875rem): question cards, hint cards, panel titles.
- **Body** (400 to 600): copy, lists, tables.
- **Label** (600, 0.875rem): chips, metadata, table headers.

## Layout

- The party is a column up to 1152px: room header on top, content below. During a game the content splits into the game and a 260px people panel from the `lg` breakpoint; on mobile the panel goes after the game.
- Ventana places the map and a 340px standings column side by side from `xl`.
- Panels use 16px to 24px corners and 16px to 40px padding; the page keeps a 16px side gutter on mobile.

## Components

### Logo
An avatar stack: a coral disc in front of two person-color discs (p0 and p2). `Logo` in `web/src/ui.tsx` pairs the mark with the lowercase wordmark and links home; it sits on the `call` ground, top left, on the home, join and party-ended screens. The room header does not carry it, because it already shows the real avatar stack. The browser icon is the same mark on a navy tile: `web/public/favicon.svg`, a 32px PNG fallback and a 180px opaque `apple-touch-icon.png`.

### Room header
Online avatars, code, "N personas · game", theme toggle and a pill of icon actions: copy link (turns green with a check when copied), back to lobby (host only, during a game) and leave (coral outline, door icon).

### People panel
Online players with avatar, name, the host chip and their status in the current game: "✓ listo", "pensando…" or "su turno".

### Avatar
A round person-color disc with the player's photo, or their emoji when there is no photo. Photos are 160px JPEGs taken from the camera on the join screen.

### Question card
Coral card, slightly rotated, "¿Quién es más probable que…" in small bold and the question in 800.

### Answer ring
A conic ring with "n/total" and "Faltan …" beside it. Used for votes, guesses and ready players.

### Podium
Three steps ordered 2, 1, 3; ties share a step. First step in coral, the others in panel-2.

### States
- Connecting: spinner with steps (party found, connecting, entering).
- Reconnecting: the content turns gray and a chip in the header says so.
- Party ended or missing: faded avatars, a headline and a way back home.

## Do's and Don'ts

### Do:
- **Do** show people with their avatar (photo or emoji on their person color) wherever they appear.
- **Do** keep coral for the action and the current position.
- **Do** use tabular digits and es-CO formatting for numbers.
- **Do** escape player names before placing them in HTML strings (map markers).
- **Do** stop animations under `prefers-reduced-motion`.

### Don't:
- **Don't** use person colors for buttons or states.
- **Don't** fill the leave button with coral.
- **Don't** add gradient heroes, product screenshots or rows of three icon cards.
- **Don't** hard-code theme colors; use the tokens so both themes work.
