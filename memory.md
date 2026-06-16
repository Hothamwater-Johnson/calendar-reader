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
