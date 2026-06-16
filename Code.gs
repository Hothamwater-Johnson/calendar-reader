/**
 * Calendar Free-Time Finder
 *
 * A Google Sheets-bound Apps Script that reads all of your Google Calendars
 * and lists your free times for the days ahead, inside the working hours you
 * choose. Run it from the "Calendar Tools" menu in the Sheet.
 */

// Default settings, used when a Settings cell is blank.
var DEFAULTS = {
  workStart: '9:00 AM',
  workEnd: '5:00 PM',
  daysAhead: 7,
  minSlotMinutes: 30,
  includeWeekends: false,
  excludeDeclined: true,
  excludeAllDay: true
};

var SETTINGS_SHEET = 'Settings';
var RESULTS_SHEET = 'Free Times';
var DIAGNOSTIC_SHEET = 'Diagnostic';
var CALENDARS_SHEET = 'Calendars';

/**
 * Adds the custom menu when the Sheet is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Calendar Tools')
    .addItem('Find Free Times', 'findFreeTimes')
    .addSeparator()
    .addItem('Set up sheet', 'setupSheet')
    .addItem('Choose calendars', 'setupCalendars')
    .addItem('Scan my calendar (diagnostic)', 'scanCalendar')
    .addToUi();
}

/**
 * Creates (or resets) the Settings sheet with friendly labels and defaults.
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET, 0);
  }
  sheet.clear();

  var rows = [
    ['Setting', 'Value', 'Notes'],
    ['Workday starts at', DEFAULTS.workStart, 'Earliest time of day to suggest (e.g. 9:00 AM)'],
    ['Workday ends at', DEFAULTS.workEnd, 'Latest time of day to suggest (e.g. 5:00 PM)'],
    ['Days to look ahead', DEFAULTS.daysAhead, 'How many days from today to check'],
    ['Shortest free slot (minutes)', DEFAULTS.minSlotMinutes, 'Ignore gaps shorter than this'],
    ['Include weekends?', DEFAULTS.includeWeekends ? 'Yes' : 'No', 'Type Yes or No'],
    ['Exclude declined meetings?', DEFAULTS.excludeDeclined ? 'Yes' : 'No', 'Type Yes or No — meetings you said No to count as free'],
    ['Exclude all-day events?', DEFAULTS.excludeAllDay ? 'Yes' : 'No', 'Type Yes or No — all-day events (birthdays, OOO) do not block the day']
  ];

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 360);
  sheet.setFrozenRows(1);

  buildCalendarsSheet_();

  SpreadsheetApp.getUi().alert(
    'All set! Check the "Calendars" tab to pick which calendars count toward ' +
    'your busy time (only your own are on by default), adjust the settings if ' +
    'you like, then choose "Calendar Tools → Find Free Times".'
  );
}

/**
 * Menu action: (re)build the Calendars tab so new calendars show up, keeping
 * any Include choices already made.
 */
function setupCalendars() {
  buildCalendarsSheet_();
  SpreadsheetApp.getUi().alert(
    'The "Calendars" tab lists every calendar you can see. Set Include? to Yes ' +
    'for the ones that should count as your busy time, then choose ' +
    '"Calendar Tools → Find Free Times".'
  );
}

/**
 * Creates/refreshes the Calendars sheet: one row per calendar with an Include?
 * (Yes/No) column. New calendars default to Yes only if you own them; existing
 * choices are preserved. No alert (callers handle messaging).
 */
function buildCalendarsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CALENDARS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CALENDARS_SHEET, 1);
  }

  // Preserve any Include choices already made, keyed by calendar name.
  var prev = {};
  if (sheet.getLastRow() >= 2) {
    var old = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < old.length; i++) {
      var oldName = String(old[i][0]).trim();
      if (oldName) prev[oldName] = old[i][1];
    }
  }
  sheet.clear();

  var calendars = CalendarApp.getAllCalendars();
  calendars.sort(function (a, b) {
    var ao = a.isOwnedByMe() ? 0 : 1;
    var bo = b.isOwnedByMe() ? 0 : 1;
    if (ao !== bo) return ao - bo;            // your own calendars first
    return a.getName().localeCompare(b.getName());
  });

  var rows = [['Calendar', 'Include?', 'Notes']];
  for (var c = 0; c < calendars.length; c++) {
    var name = calendars[c].getName();
    var owned = calendars[c].isOwnedByMe();
    var include = prev.hasOwnProperty(name) ? prev[name] : (owned ? 'Yes' : 'No');
    rows.push([name, include, owned ? 'Your own calendar' : 'Subscribed (someone else’s)']);
  }

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  if (rows.length > 1) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).build();
    sheet.getRange(2, 2, rows.length - 1, 1).setDataValidation(rule);
  }
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 220);
  sheet.setFrozenRows(1);
}

/**
 * Main action: reads settings, gathers busy times across all calendars,
 * computes free slots, and writes them to the Free Times sheet.
 */
function findFreeTimes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = readSettings_();
  var tz = Session.getScriptTimeZone();

  var now = new Date();
  var rangeStart = startOfDay_(now);
  var rangeEnd = addDays_(rangeStart, settings.daysAhead);

  var busy = getBusyIntervals_(rangeStart, rangeEnd, settings);
  busy = mergeIntervals_(busy);

  var output = [];
  for (var d = 0; d < settings.daysAhead; d++) {
    var dayStart = addDays_(rangeStart, d);
    var dow = dayStart.getDay(); // 0 = Sun, 6 = Sat
    var isWeekend = (dow === 0 || dow === 6);
    if (isWeekend && !settings.includeWeekends) {
      continue;
    }

    var windowStart = setTimeOfDay_(dayStart, settings.workStartMinutes);
    var windowEnd = setTimeOfDay_(dayStart, settings.workEndMinutes);

    // Don't suggest times already in the past today.
    if (windowStart < now) {
      windowStart = now > windowEnd ? windowEnd : now;
    }

    var gaps = subtractBusy_(windowStart, windowEnd, busy);
    var slots = [];
    for (var g = 0; g < gaps.length; g++) {
      var minutes = (gaps[g].end - gaps[g].start) / 60000;
      if (minutes >= settings.minSlotMinutes) {
        slots.push(formatSlot_(gaps[g].start, tz) + ' – ' + formatSlot_(gaps[g].end, tz));
      }
    }

    var label = Utilities.formatDate(dayStart, tz, 'EEE, MMM d');
    output.push([label, slots.length ? slots.join(', ') : '(no free time)']);
  }

  writeResults_(ss, output, tz);
}

/**
 * Reads the Settings sheet, falling back to DEFAULTS for blank cells.
 */
function readSettings_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET);
  var values = {};
  if (sheet) {
    var data = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
    for (var i = 0; i < data.length; i++) {
      var key = String(data[i][0]).trim().toLowerCase();
      values[key] = data[i][1];
    }
  }

  var workStart = values['workday starts at'] || DEFAULTS.workStart;
  var workEnd = values['workday ends at'] || DEFAULTS.workEnd;
  var daysAhead = parseInt(values['days to look ahead'], 10);
  var minSlot = parseInt(values['shortest free slot (minutes)'], 10);
  var weekends = String(values['include weekends?'] || '').trim().toLowerCase();

  return {
    workStartMinutes: parseTimeToMinutes_(workStart, 9 * 60),
    workEndMinutes: parseTimeToMinutes_(workEnd, 17 * 60),
    daysAhead: isNaN(daysAhead) || daysAhead < 1 ? DEFAULTS.daysAhead : daysAhead,
    minSlotMinutes: isNaN(minSlot) || minSlot < 0 ? DEFAULTS.minSlotMinutes : minSlot,
    includeWeekends: weekends === 'yes' || weekends === 'true',
    excludeDeclined: parseYesNo_(values['exclude declined meetings?'], DEFAULTS.excludeDeclined),
    excludeAllDay: parseYesNo_(values['exclude all-day events?'], DEFAULTS.excludeAllDay)
  };
}

/**
 * Parses a Yes/No cell. Blank/unrecognized falls back to `fallback`.
 */
function parseYesNo_(value, fallback) {
  var s = String(value == null ? '' : value).trim().toLowerCase();
  if (s === 'yes' || s === 'true') return true;
  if (s === 'no' || s === 'false') return false;
  return fallback;
}

/**
 * Returns the set of calendar names marked Include = Yes on the Calendars tab,
 * or null if that tab doesn't exist yet (callers then fall back to owned-only).
 */
function getIncludedCalendarNames_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CALENDARS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var set = {};
  for (var i = 0; i < data.length; i++) {
    var name = String(data[i][0]).trim();
    if (name && parseYesNo_(data[i][1], false)) set[name] = true;
  }
  return set;
}

/**
 * Whether a calendar should count toward busy time. With no Calendars tab yet,
 * default to calendars the user owns (skips subscribed coworker calendars).
 */
function isCalendarIncluded_(calendar, includedSet) {
  if (includedSet === null) return calendar.isOwnedByMe();
  return includedSet[calendar.getName()] === true;
}

/**
 * Collects busy intervals from the included calendars, within [start, end).
 * Declined meetings and all-day events are skipped when their setting is on.
 */
function getBusyIntervals_(start, end, settings) {
  var calendars = CalendarApp.getAllCalendars();
  var included = getIncludedCalendarNames_();
  var intervals = [];
  for (var c = 0; c < calendars.length; c++) {
    if (!isCalendarIncluded_(calendars[c], included)) continue;
    var events = calendars[c].getEvents(start, end);
    for (var e = 0; e < events.length; e++) {
      var event = events[e];
      if (settings.excludeDeclined && event.getMyStatus() === CalendarApp.GuestStatus.NO) {
        continue;
      }
      if (settings.excludeAllDay && event.isAllDayEvent()) {
        continue;
      }
      intervals.push({ start: event.getStartTime(), end: event.getEndTime() });
    }
  }
  return intervals;
}

/**
 * Sorts and coalesces overlapping/adjacent intervals.
 */
function mergeIntervals_(intervals) {
  if (!intervals.length) return [];
  intervals.sort(function (a, b) { return a.start - b.start; });

  var merged = [{ start: intervals[0].start, end: intervals[0].end }];
  for (var i = 1; i < intervals.length; i++) {
    var last = merged[merged.length - 1];
    if (intervals[i].start <= last.end) {
      if (intervals[i].end > last.end) last.end = intervals[i].end;
    } else {
      merged.push({ start: intervals[i].start, end: intervals[i].end });
    }
  }
  return merged;
}

/**
 * Returns the free gaps within [windowStart, windowEnd) after removing busy time.
 * Assumes `busy` is sorted and merged.
 */
function subtractBusy_(windowStart, windowEnd, busy) {
  var gaps = [];
  var cursor = windowStart;
  if (cursor >= windowEnd) return gaps;

  for (var i = 0; i < busy.length; i++) {
    var b = busy[i];
    if (b.end <= cursor) continue;        // entirely before the cursor
    if (b.start >= windowEnd) break;      // past the window
    if (b.start > cursor) {
      gaps.push({ start: cursor, end: new Date(Math.min(b.start.getTime(), windowEnd.getTime())) });
    }
    if (b.end > cursor) {
      cursor = new Date(Math.min(b.end.getTime(), windowEnd.getTime()));
    }
    if (cursor >= windowEnd) break;
  }
  if (cursor < windowEnd) {
    gaps.push({ start: cursor, end: windowEnd });
  }
  return gaps;
}

/**
 * Writes the day/slots rows to the Free Times sheet, clearing previous output.
 */
function writeResults_(ss, rows, tz) {
  var sheet = ss.getSheetByName(RESULTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RESULTS_SHEET);
  }
  sheet.clear();

  var generated = 'Free times — generated ' + Utilities.formatDate(new Date(), tz, 'EEE, MMM d, h:mm a');
  sheet.getRange(1, 1).setValue(generated).setFontWeight('bold');
  sheet.getRange(2, 1, 1, 2).setValues([['Day', 'Free times']]).setFontWeight('bold');

  if (rows.length) {
    sheet.getRange(3, 1, rows.length, 2).setValues(rows);
  } else {
    sheet.getRange(3, 1).setValue('No days in range. Check your settings.');
  }

  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 520);
  sheet.setFrozenRows(2);
  ss.setActiveSheet(sheet);
}

/**
 * One-time diagnostic: lists how each upcoming event is classified, so we can
 * see how booking-page holds appear in this account. The "Free/Busy" and
 * "Event type" columns need the Advanced Calendar Service (see SETUP.md); the
 * rest works without it.
 */
function scanCalendar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = readSettings_();
  var tz = Session.getScriptTimeZone();

  var rangeStart = startOfDay_(new Date());
  var rangeEnd = addDays_(rangeStart, settings.daysAhead);
  var hasAdvanced = (typeof Calendar !== 'undefined');

  var rows = [];
  var calendars = CalendarApp.getAllCalendars();
  var included = getIncludedCalendarNames_();
  for (var c = 0; c < calendars.length; c++) {
    var cal = calendars[c];
    if (!isCalendarIncluded_(cal, included)) continue;
    var calName = cal.getName();
    var events = cal.getEvents(rangeStart, rangeEnd);

    // Look up richer fields (eventType, Free/Busy) by iCalUID when available.
    var extra = hasAdvanced ? getAdvancedDetails_(cal.getId(), rangeStart, rangeEnd) : {};

    for (var e = 0; e < events.length; e++) {
      var event = events[e];
      var info = extra[event.getId()] || {};
      rows.push([
        calName,
        event.getTitle(),
        Utilities.formatDate(event.getStartTime(), tz, 'EEE, MMM d, h:mm a'),
        event.isAllDayEvent() ? 'Yes' : 'No',
        guestStatusLabel_(event.getMyStatus()),
        info.freeBusy || (hasAdvanced ? 'Busy' : '(enable Calendar service)'),
        info.eventType || (hasAdvanced ? 'default' : '(enable Calendar service)')
      ]);
    }
  }

  writeDiagnostic_(ss, rows, hasAdvanced);
}

/**
 * Returns a map of iCalUID -> {freeBusy, eventType} from the Advanced Calendar
 * Service for one calendar. Used only by the diagnostic.
 */
function getAdvancedDetails_(calendarId, start, end) {
  var map = {};
  try {
    var resp = Calendar.Events.list(calendarId, {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      maxResults: 250
    });
    var items = resp.items || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.iCalUID) continue;
      map[item.iCalUID] = {
        freeBusy: item.transparency === 'transparent' ? 'Free' : 'Busy',
        eventType: item.eventType || 'default'
      };
    }
  } catch (err) {
    // Calendar service not enabled / no access — diagnostic still shows basics.
  }
  return map;
}

/**
 * Human-readable label for a CalendarApp GuestStatus.
 */
function guestStatusLabel_(status) {
  if (status === CalendarApp.GuestStatus.NO) return 'Declined';
  if (status === CalendarApp.GuestStatus.YES) return 'Yes';
  if (status === CalendarApp.GuestStatus.MAYBE) return 'Maybe';
  if (status === CalendarApp.GuestStatus.INVITED) return 'Invited';
  if (status === CalendarApp.GuestStatus.OWNER) return 'Owner';
  return '—';
}

/**
 * Writes the diagnostic rows to the Diagnostic sheet, clearing previous output.
 */
function writeDiagnostic_(ss, rows, hasAdvanced) {
  var sheet = ss.getSheetByName(DIAGNOSTIC_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DIAGNOSTIC_SHEET);
  }
  sheet.clear();

  var note = hasAdvanced
    ? 'Diagnostic — send this tab back so the booking-page setting can be finished.'
    : 'Diagnostic — for the "Free/Busy" and "Event type" columns, turn on the Calendar service (see SETUP.md), then run this again.';
  sheet.getRange(1, 1).setValue(note).setFontWeight('bold');

  var header = ['Calendar', 'Event', 'Starts', 'All-day?', 'My RSVP', 'Free/Busy', 'Event type'];
  sheet.getRange(2, 1, 1, header.length).setValues([header]).setFontWeight('bold');

  if (rows.length) {
    sheet.getRange(3, 1, rows.length, header.length).setValues(rows);
  } else {
    sheet.getRange(3, 1).setValue('No events found in the range.');
  }

  sheet.setFrozenRows(2);
  sheet.autoResizeColumns(1, header.length);
  ss.setActiveSheet(sheet);
}

// ---- small date/time helpers ----

function startOfDay_(date) {
  var d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays_(date, days) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function setTimeOfDay_(day, minutesFromMidnight) {
  var d = startOfDay_(day);
  d.setMinutes(minutesFromMidnight);
  return d;
}

function formatSlot_(date, tz) {
  return Utilities.formatDate(date, tz, 'h:mm a');
}

/**
 * Parses "9:00 AM", "9 AM", "17:00", etc. into minutes from midnight.
 * Returns `fallback` if it can't be understood.
 */
function parseTimeToMinutes_(value, fallback) {
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  var s = String(value).trim().toLowerCase();
  var m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return fallback;

  var hour = parseInt(m[1], 10);
  var minute = m[2] ? parseInt(m[2], 10) : 0;
  var ampm = m[3];

  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return fallback;

  return hour * 60 + minute;
}
