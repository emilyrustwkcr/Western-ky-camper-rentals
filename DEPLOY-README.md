# Deploying to Netlify — No Manual File Editing Required

This project is fully self-contained. The Netlify Forms setup is already
baked into `index.html` — you do NOT need to open, edit, or even look at
any files to get form submissions emailed to you.

## ⚠️ IMPORTANT — Live Availability Calendar Requires GitHub Deploy

This project includes a serverless function
(`netlify/functions/availability.js`) that reads live booking dates from
Google Calendar. **Serverless functions only work when Netlify builds the
site from source** — they do NOT work with Netlify Drop (drag-and-drop),
since Drop only hosts static files as-is with no build step.

**If you deploy via Netlify Drop:** the rest of the site works fine, but
the availability calendar will show a small "couldn't load live
availability" message instead of live booked dates, since the function
never gets deployed.

**To get the live calendar working, use Option B (GitHub) below.** Since
your site is already connected to GitHub with auto-deploy, this is just
your normal workflow — no extra steps beyond pushing these files.

## Option A — Easiest: Netlify Drop (drag-and-drop, works great on iPad)

Netlify Drop builds the site FOR you from source files — you don't need a
terminal or Node.js installed on your iPad.

1. Go to **https://app.netlify.com/drop** in Safari.
2. Select this whole project folder (`western-ky-camper-rentals`) and drag
   it onto the page — or use the "Browse to upload" option if drag-and-drop
   is awkward on iPad.

   ⚠️ Netlify Drop deploys files as-is; it does NOT run `npm run build`
   for you, and it does NOT deploy serverless functions (see warning
   above — the live calendar won't work with this option). If you use
   this option, see "Option B" instructions below — you'll want to
   connect a repo instead so Netlify can run the build step AND deploy
   the availability function.

## Option B — Recommended: Connect a GitHub Repo (Netlify builds it for you)

This is the best option from an iPad since Netlify does all the building on
its own servers — you just need to get these files into a GitHub repo.

1. **Get the files into GitHub** (pick whichever is easiest on iPad):
   - Use the GitHub mobile app or github.com in Safari → create a new repo
     → use "Upload files" → upload this entire project folder's contents.
   - Or, if you have access to a computer at some point, `git push` normally.

2. **Connect the repo to Netlify:**
   - Go to **https://app.netlify.com** → "Add new site" → "Import an
     existing project" → choose GitHub → select your repo.
   - Netlify will auto-detect the build settings from `netlify.toml`
     (build command: `npm run build`, publish folder: `dist`). You
     shouldn't need to change anything — just click "Deploy site."

3. **Wait for the build to finish** (usually 1–2 minutes). Your site is live!

## After Your First Deploy: Turn On Email Notifications

This is the only manual step, and it's just clicking buttons in the
Netlify dashboard — no code or files involved:

1. Go to your site in the Netlify dashboard → **Forms** (left sidebar).
2. You should see two forms listed: **quote-request** and **contact**.
   (If you don't see them yet, do a fresh deploy — they appear after the
   first successful build.)
3. Click into **quote-request** → **Settings & usage** → **Add
   notification** → **Email notification** → enter
   `emily.rust@westernkycamperrentals.com` → Save.
4. Repeat step 3 for the **contact** form.

That's it. From now on, every booking request and every contact form
submission will land directly in your email inbox automatically —
no visitor action required, no manual editing, ever.

## Setting Up the Live Availability Calendar (Google Calendar)

Both camper calendar IDs are already wired into
`netlify/functions/availability.js`. There's just ONE manual step left,
and it's a Google Calendar setting, not a code change:

1. Open Google Calendar → find your **Cedar Creek Silverback** calendar in
   the left sidebar → hover over it → click the three dots → **Settings
   and sharing**.
2. Scroll to **"Access permissions for events"** → check **"Make available
   to public"** → in the dropdown that appears, choose **"See all event
   details."**
3. Repeat steps 1–2 for your **Aspen Trail** calendar.
4. That's it — no calendar ID or link copying needed, since those are
   already in the code.

⚠️ **Important:** skipping step 2 means the website simply cannot read the
calendar at all — it's not a login issue, it's required so the calendar
is publicly readable. Keep event titles generic (e.g. "Booked" or a first
name only) since anything on a public calendar becomes visible to anyone
with the link.

**To log a booking:** just create an event on the correct calendar
spanning check-in through check-out. All-day events work best — Google
automatically treats the end date as checkout day, which matches exactly
how the website displays same-day turnarounds. No code edits, no
redeploys, ever, for a routine booking.

## Project Structure (for reference — you never need to touch these)

```
western-ky-camper-rentals/
├── index.html                        ← Page shell + hidden Netlify form registrations
├── package.json                       ← Dependencies (React, Vite)
├── vite.config.js                     ← Build configuration
├── netlify.toml                       ← Tells Netlify how to build & deploy automatically
├── src/
│   ├── main.jsx                        ← Mounts the app
│   └── App.jsx                          ← Your full website (all pages, all photos)
└── netlify/
    └── functions/
        └── availability.js             ← Reads live booking dates from Google Calendar
```
