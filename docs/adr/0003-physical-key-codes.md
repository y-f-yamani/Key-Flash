# ADR-0003: Match shortcuts on physical `event.code`, not `event.key`

**Status:** Accepted · 2026-06-11

## Context
We support English and Arabic users. `event.key` reflects the active layout
(pressing the C key on an Arabic layout yields `ء`), while `event.code` reflects the
physical key (`KeyC`) regardless of layout. Windows accelerators are virtual-key
based, which tracks physical position for letter shortcuts on Arabic layouts.

## Decision
The chord model stores W3C `KeyboardEvent.code` values (`KeyE`, `Digit1`, `Tab`).
Normalization maps incoming events to `{ modifiers: Set, code }`. Display labels are
derived separately from codes (so we can later render layout-aware keycaps).

## Consequences
- Arabic-layout users press the same physical keys Windows expects — correct behavior.
- Immune to Caps Lock/Shift transformations of `event.key`.
- Trade-off: non-QWERTY *physical* layouts (AZERTY) see QWERTY-position matching for
  letters; acceptable for a Windows-shortcut product, revisit with layout maps if needed.
