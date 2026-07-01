// netlify/functions/availability.js
//
// Fetches each camper's PRIVATE Google Calendar "Secret address in iCal
// format" and returns the booked date ranges as JSON. This runs
// server-side on Netlify, which is required because browsers cannot fetch
// Google's .ics feeds directly (no CORS headers) — a server-to-server
// request like this one has no such restriction.
//
// No Google Cloud project, no API key, and the calendars stay fully
// PRIVATE — nothing needs to be made public. The secret .ics URLs are read
// from Netlify environment variables (set in the Netlify dashboard, never
// committed to git), so they never appear in the source code or GitHub repo.
//
// Required environment variables (set in Netlify → Site settings →
// Environment variables):
//   CEDAR_CREEK_ICS_URL   — Cedar Creek's "Secret address in iCal format"
//   ASPEN_TRAIL_ICS_URL   — Aspen Trail's "Secret address in iCal format"
//
// Zero external dependencies on purpose, so this works with any Netlify
// deploy method without needing an npm install step.

import https from "node:https";

const ICS_URL_ENV_VARS = {
  "cedar-creek": "CEDAR_CREEK_ICS_URL",
  "aspen-trail": "ASPEN_TRAIL_ICS_URL",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  // Cache for 5 minutes so a burst of visitors doesn't hammer Google's servers.
  "Cache-Control": "public, max-age=300",
};

function fetchText(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // Google's ICS links can redirect (e.g. http -> https); follow a few hops.
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          fetchText(res.headers.location, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`ICS fetch failed with status ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

// RFC5545: a line starting with a space or tab is a continuation of the
// previous line ("folded" lines). Unfold them before parsing.
export function unfoldLines(icsText) {
  const rawLines = icsText.split(/\r\n|\n|\r/);
  const lines = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

// Handles both all-day values ("20260710") and date-time values
// ("20260710T140000Z" / "20260710T140000") — we only need the date part.
export function parseIcsDate(value) {
  const digits = value.replace(/[^0-9]/g, "");
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  if (!y || !m || !d) return null;
  return `${y}-${m}-${d}`;
}

export function parseEvents(icsText) {
  const lines = unfoldLines(icsText);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { current = {}; continue; }
    if (line === "END:VEVENT") {
      if (current && current.start && current.end) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    if (key.startsWith("DTSTART")) current.start = parseIcsDate(value);
    else if (key.startsWith("DTEND")) current.end = parseIcsDate(value);
  }
  return events;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const camperId = (event.queryStringParameters && event.queryStringParameters.camper) || "";
  const envVarName = ICS_URL_ENV_VARS[camperId];

  if (!envVarName) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Unknown camper "${camperId}"` }),
    };
  }

  const icsUrl = process.env[envVarName];

  if (!icsUrl) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Missing environment variable ${envVarName} in Netlify site settings` }),
    };
  }

  try {
    const icsText = await fetchText(icsUrl);
    const events = parseEvents(icsText);
    const ranges = events.map((e) => ({ start: e.start, end: e.end }));
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ranges }) };
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Could not read the calendar feed: ${err.message}` }),
    };
  }
};
