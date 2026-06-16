# Memory

A running log of decisions made on this project. Record the decision, the date, and the reasoning so future work has context and doesn't relitigate settled choices.

## Format

```
## YYYY-MM-DD — <short title>
**Decision:** What was decided.
**Reasoning:** Why, including alternatives considered and rejected.
```

---

## 2026-06-16 — Added CLAUDE.md, memory.md, errors.md
**Decision:** Established CLAUDE.md (behavioral guidelines), memory.md (decision log), and errors.md (error log) as project scaffolding.
**Reasoning:** Persist conventions and context across sessions so coding stays consistent and past decisions/mistakes are not repeated.

## 2026-06-16 — Calendar free-time finder: Apps Script in a Google Sheet (not Python)
**Decision:** Built the tool as a Google Sheets-bound Apps Script (`Code.gs`) rather than a Python CLI. It reads all calendars via `CalendarApp.getAllCalendars()`, computes free slots inside configurable working hours, and writes them to a "Free Times" sheet. Settings live in editable cells. Defaults: 9 AM–5 PM, weekdays only, 7 days ahead, 30-min minimum slot, declined and all-day events count as busy. Timezone from `Session.getScriptTimeZone()`.
**Reasoning:** The end user is the requester's non-technical wife, and it needs to "live in her Google Drive." A Python CLI with `credentials.json` + browser OAuth is too much setup. Apps Script runs inside her Google account with a one-time "Allow" click, no keys or installs, and is driven by a menu button in the Sheet. Editable Settings cells let her adjust hours without touching code. `SETUP.md` gives click-by-click instructions since she sets it up herself.

## 2026-06-16 — Three new "what counts as busy" toggles; booking pages deferred behind a diagnostic
**Decision:** Added on/off settings to exclude (1) declined meetings, (2) all-day events, and (3) booking-page holds — all defaulting ON (excluded = treated as free). Shipped (1) and (2) now via `CalendarApp` (`getMyStatus() === GuestStatus.NO`, `isAllDayEvent()`). Deferred (3): instead of guessing, added a one-time `scanCalendar` diagnostic that writes a "Diagnostic" sheet classifying upcoming events (all-day / RSVP / Free-Busy / eventType, the latter two via the optional Advanced Calendar Service). Once we see how booking pages surface in the real account, the booking-page toggle + filter lands in a follow-up.
**Reasoning:** Google's pre-configured "booking pages" have no clean identifier in the Calendar API — documented `eventType` values are only birthday/default/focusTime/fromGmail/outOfOffice/workingLocation, none for booking. Guessing the signal risks a non-functional toggle for a non-technical user. The diagnostic reveals the actual classification (likely a separate sub-calendar or `transparency: transparent`) so Phase 2 can match it reliably. Kept the main flow on `CalendarApp` so the two shipping toggles need no extra setup; the Advanced Calendar Service is only required for the diagnostic.
