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

## Step 6 — Find your free times

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

After changing anything, click **Calendar Tools → Find Free Times** again to
refresh.

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
