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
  includeWeekends: false
};

var SETTINGS_SHEET = 'Settings';
var RESULTS_SHEET = 'Free Times';

/**
 * Adds the custom menu when the Sheet is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Calendar Tools')
    .addItem('Find Free Times', 'findFreeTimes')
    .addSeparator()
    .addItem('Set up sheet', 'setupSheet')
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
    ['Include weekends?', DEFAULTS.includeWeekends ? 'Yes' : 'No', 'Type Yes or No']
  ];

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 360);
  sheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert(
    'All set! Adjust the settings if you like, then choose ' +
    '"Calendar Tools → Find Free Times".'
  );
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

  var busy = getBusyIntervals_(rangeStart, rangeEnd);
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
    includeWeekends: weekends === 'yes' || weekends === 'true'
  };
}

/**
 * Collects busy intervals from every calendar the user has, within [start, end).
 * All-day and declined events are included (counted as busy).
 */
function getBusyIntervals_(start, end) {
  var calendars = CalendarApp.getAllCalendars();
  var intervals = [];
  for (var c = 0; c < calendars.length; c++) {
    var events = calendars[c].getEvents(start, end);
    for (var e = 0; e < events.length; e++) {
      intervals.push({ start: events[e].getStartTime(), end: events[e].getEndTime() });
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
