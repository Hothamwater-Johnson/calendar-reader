# Setup Guide — Free Times Finder

This guide walks you through setting up a Google Sheet that looks at your
Google Calendar and lists when you're free. It takes about 5 minutes, and you
only have to do it once. No technical experience needed — just follow each step.

> **Tip:** Do this on a computer (not a phone). It's much easier.

---

## Step 1 — Make a new Google Sheet

1. Go to **[drive.google.com](https://drive.google.com)** and sign in if asked.
2. Click the **+ New** button (top-left) → **Google Sheets** → **Blank spreadsheet**.
3. At the very top-left, click where it says *"Untitled spreadsheet"* and type a
   name like **Free Times Finder**, then press Enter.

## Step 2 — Open the script editor

1. In the menu bar at the top, click **Extensions**.
2. Click **Apps Script**. A new browser tab opens with a code editor.

## Step 3 — Paste in the code

1. In that new tab, you'll see a box with a little bit of sample code
   (something like `function myFunction() { }`).
2. Click inside the box, select everything (press **Ctrl+A**, or **⌘+A** on a
   Mac), and delete it so the box is empty.
3. Open the **`Code.gs`** file from this project, select all of its text, and
   copy it.
4. Click back in the empty box and paste (**Ctrl+V**, or **⌘+V** on a Mac).
5. Click the **Save** icon (the little floppy disk near the top), or press
   **Ctrl+S** / **⌘+S**.

## Step 4 — Go back to your Sheet and reload

1. Close the Apps Script tab (or switch back to the tab with your spreadsheet).
2. **Reload the spreadsheet page** (press **F5**, or click your browser's
   reload button).
3. Wait a few seconds. A new menu called **Calendar Tools** should appear in
   the menu bar, to the right of "Help".

   *If you don't see it, wait a moment and reload the page again.*

## Step 5 — Set it up and give permission

1. Click **Calendar Tools** → **Set up sheet**.
2. The first time, Google will ask for permission. This is normal — the script
   needs to read your calendar to find your free times.
   - Click **Continue** / **Review permissions**.
   - Choose your Google account.
   - You may see a screen saying *"Google hasn't verified this app."* This is
     expected because it's your own personal script. Click
     **Advanced** → **Go to Free Times Finder (unsafe)**.
     *(It's safe — "unverified" just means it's a private script you made, not
     a public app.)*
   - Click **Allow**.
3. Click **Calendar Tools** → **Set up sheet** once more if the menu closed.
   A tab called **Settings** will appear with some options you can change.

## Step 6 — Pick which calendars count

If you're subscribed to other people's calendars (coworkers, shared team
calendars), the tool should ignore those — otherwise it thinks you're busy
whenever *they* are.

1. Open the **Calendars** tab (created during setup).
2. Each calendar has an **Include?** column. **Your own calendars default to
   Yes**; calendars you're just subscribed to default to **No**.
3. Change any to Yes/No so only the calendars that represent *your* time are set
   to **Yes**.
4. If you add a new calendar later, click **Calendar Tools → Choose calendars**
   to refresh the list (your existing choices are kept).

## Step 7 — Find your free times

1. Click **Calendar Tools** → **Find Free Times**.
2. After a moment, a tab called **Free Times** appears with your open times,
   one row per day. Done!

---

## Changing the settings

Open the **Settings** tab and edit the values in the middle column:

| Setting | What it does |
|---|---|
| **Workday starts at** | Earliest time of day to suggest (e.g. `9:00 AM`) |
| **Workday ends at** | Latest time of day to suggest (e.g. `5:00 PM`) |
| **Days to look ahead** | How many days from today to check (e.g. `7`) |
| **Shortest free slot (minutes)** | Ignore gaps shorter than this (e.g. `30`) |
| **Include weekends?** | Type `Yes` or `No` |
| **Exclude declined meetings?** | `Yes` = meetings you said *No* to count as free time |
| **Exclude all-day events?** | `Yes` = all-day events (birthdays, OOO banners) don't block the day |

After changing anything, click **Calendar Tools → Find Free Times** again to
refresh.

---

## Already set it up before? Updating to the latest version

If you set up the Sheet earlier and want the newest features:

1. In the Sheet, click **Extensions → Apps Script**.
2. Select everything in the code box (**Ctrl+A** / **⌘+A**) and delete it.
3. Paste in the latest **`Code.gs`**, then click **Save**.
4. Go back to the Sheet and **reload the page** (F5).
5. Click **Calendar Tools → Set up sheet** to add any new settings rows and
   build the **Calendars** tab.
6. Open the **Calendars** tab and make sure only *your* calendars are set to
   **Include? = Yes** (see Step 6 above).

---

## Booking pages — one-time scan

Google "booking pages" don't have a clear label we can detect automatically, so
there's a one-time scan to see how they show up in *your* calendar.

1. First make sure the **Calendars** tab has only your own calendars set to
   **Yes** (so the scan focuses on your time, not coworkers').
2. **Turn on the Calendar service** (needed for the full detail):
   - In the Sheet, click **Extensions → Apps Script**.
   - On the left, next to **Services**, click the **+**.
   - Find **Calendar API** in the list, click it, then click **Add**.
3. Go back to the Sheet, then click **Calendar Tools → Scan my calendar
   (diagnostic)**.
4. A tab called **Diagnostic** appears, listing your upcoming events with the
   **Free/Busy** and **Event type** columns now filled in.
5. Send that **Diagnostic** tab back so the booking-page setting can be finished.

---

## Troubleshooting

- **I don't see the "Calendar Tools" menu.** Reload the spreadsheet page (F5)
  and wait a few seconds. Make sure you saved the code in Step 3.
- **It says I need permission again.** Just click through and **Allow** — Google
  sometimes re-asks.
- **The times look wrong by a few hours.** The script uses your Google
  account's time zone. In the Sheet, check **File → Settings → Time zone**.
- **Nothing is listed.** You might be fully booked, or your "Days to look ahead"
  / weekend settings are excluding everything. Try widening them and re-run.
