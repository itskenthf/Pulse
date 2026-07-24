# Pulse Design System

Version: 1.0

---

# Philosophy

Pulse is a personal operating system.

It should feel calm, premium, intelligent, and effortless.

The interface should disappear into the background while surfacing information that matters.

Avoid designing Pulse like:

- Admin dashboards
- Analytics software
- Enterprise applications

Instead, design it like modern desktop software.

Design inspirations:

- Apple Liquid Glass
- macOS
- Arc Browser
- Raycast
- Linear
- Notion
- Vercel

Pulse should establish its own identity rather than imitate any one product.

---

# Core Principles

## 1. Content First

The content is always more important than decoration.

Glass should support information—not become the focus.

---

## 2. Calm Interface

Everything should feel quiet.

Avoid:

- loud colors
- harsh shadows
- excessive gradients
- unnecessary borders

The UI should feel effortless.

---

## 3. Spacious

Whitespace is intentional.

Every element should have room to breathe.

Never make layouts feel crowded.

---

## 4. Hierarchy

Users should instantly know:

1. where to look
2. what matters
3. what can wait

Hierarchy is created using:

- spacing
- typography
- size
- contrast

NOT bright colors.

---

## 5. Consistency

Every widget should feel like it belongs to the same operating system.

Never style widgets independently.

---

# Color System

## Primary Background

Very soft neutral.

Never pure white.

---

## Surface

Glass surfaces.

Slight translucency.

Subtle tint.

---

## Text

Primary

High contrast.

Secondary

Muted.

Tertiary

Low emphasis.

Disabled

Minimal contrast.

---

## Accent Colors

Accent colors communicate identity.

Never dominate the interface.

GitHub

Blue

Spotify

Green

Steam

Blue

Calendar

Purple

Weather

Sky

Finance

Amber

Tasks

Orange

Productivity

Indigo

Only use accent colors for:

- icons
- indicators
- small gradients
- progress
- highlights

Avoid full colored cards.

---

# Glass Materials

Create reusable glass variants.

## Glass Light

Used for:

- widgets
- buttons
- cards

Characteristics:

- soft blur
- subtle transparency
- thin border
- minimal shadow

---

## Glass Medium

Used for:

- sidebar
- navigation
- dialogs

Slightly stronger blur.

Higher contrast.

---

## Glass Heavy

Used for:

- modals
- overlays
- floating menus

Highest blur.

Highest separation.

Never use everywhere.

---

# Radius Scale

Small

12px

Medium

18px

Large

24px

Extra Large

32px

Avoid sharp corners.

---

# Shadow System

Use layered ambient shadows.

Avoid harsh elevation.

The goal is floating depth.

Not material design.

---

# Spacing System

Base unit

8px

Scale

4

8

12

16

24

32

40

48

64

Use spacing tokens.

Never use arbitrary values.

---

# Typography

## Hero

Dashboard greeting.

Largest text.

Bold.

---

## Section Heading

Widget groups.

Medium weight.

---

## Widget Title

Readable.

Consistent.

---

## Body

Default content.

---

## Caption

Metadata.

Secondary information.

---

# Motion

Animations should feel physical.

Use spring motion.

Hover

Gentle lift.

Click

Soft compression.

Appear

Fade and rise.

Duration

Fast

150ms

Normal

250ms

Slow

400ms

Never animate purely for decoration.

Every animation should improve usability.

---

# Layout

Desktop first.

The dashboard should feel balanced.

Avoid:

perfect symmetry.

Instead:

visual balance.

Widgets may have different sizes.

Important widgets deserve more space.

---

# Widget Rules

Every widget should include:

- title
- icon
- primary content
- optional metadata
- optional actions

Widgets should never feel overloaded.

One widget = one purpose.

---

# Sidebar

Compact.

Minimal.

Purpose driven.

Icons should be readable without labels when collapsed.

Future support:

Dashboard

Widgets

Calendar

Tasks

Notes

Settings

---

# Navigation

Top navigation should remain lightweight.

Future ready for:

Search

Notifications

Profile

Settings

Sign Out

---

# Buttons

Primary

Filled.

Secondary

Glass.

Icon

Circular.

Ghost

Minimal.

Avoid heavy outlines.

---

# Icons

Use one icon library throughout the project.

Recommended:

Lucide

Consistent size.

Consistent stroke.

---

# Dashboard Flow

The dashboard should naturally guide the eye.

Hero

↓

Today's Overview

↓

Important Widgets

↓

Secondary Widgets

↓

Utility Widgets

Users should never wonder where to look next.

---

# Responsive

Desktop

Primary experience.

Tablet

Maintain hierarchy.

Mobile

Stack widgets naturally.

Avoid horizontal scrolling.

---

# Accessibility

Always maintain:

Readable text.

Clear focus states.

Keyboard navigation.

Reduced motion support.

Minimum AA contrast.

Glass should never reduce readability.

---

# Performance

Avoid excessive backdrop blur.

Reuse components.

Minimize re-renders.

Prefer reusable primitives over repeated styling.

---

# Code Architecture

UI should be built from reusable primitives.

Examples:

GlassCard

GlassPanel

GlassButton

GlassNavbar

GlassSidebar

DashboardGrid

WidgetShell

WidgetHeader

WidgetFooter

Design tokens should power the interface instead of hardcoded values.

---

# Future Direction

Pulse should feel less like a website and more like a desktop operating system.

Every future feature should ask:

"Does this make Pulse feel more calm, premium, and intentional?"

If not, redesign it before implementation.
