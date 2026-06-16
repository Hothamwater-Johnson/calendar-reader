# calendar-reader

A simple Google Sheet that reads your Google Calendar and lists when you're
**free** over the coming days, within the working hours you choose.

It runs entirely inside your Google account using Google Apps Script — there's
nothing to install, no passwords or API keys, and it lives in your Google Drive.
You run it by clicking a menu item in the Sheet.

## What it does

- Merges your busy times across the calendars **you choose** (a **Calendars**
  tab lets you include/exclude each one; your own calendars are on by default,
  so coworkers' shared calendars don't make you look busy).
- Lists free slots for the next several days, grouped by day.
- Only suggests times inside your chosen workday (default **9:00 AM–5:00 PM**,
  weekdays only).
- Ignores tiny gaps (default: shorter than **30 minutes**).
- Can skip **declined meetings** and **all-day events** so they don't block your
  free time (both on by default).
- All settings are editable in a **Settings** tab — no code changes needed.

## Setup

See **[SETUP.md](SETUP.md)** for step-by-step instructions written for
non-technical users. The script itself is in **[Code.gs](Code.gs)** — you paste
it into the Sheet's Apps Script editor once.

## Files

- `Code.gs` — the Apps Script you paste into your Google Sheet.
- `SETUP.md` — friendly, click-by-click setup guide.
