# BarHop Navigator

Build a web app called "BarPulse" — a live bar capacity and wait-time tracker
for the Marina and Cow Hollow neighborhoods in San Francisco.

CORE CONCEPT
Patrons want to glance at a map and instantly know which bars have no wait,
which are filling up, and which have a line out the door — plus get a feel
for each bar's vibe before they go.

LAYOUT
- An interactive map of the Marina/Cow Hollow area as the main view, with
  each bar shown as a pin.
- A side panel listing all bars with their current status, that stays in
  sync with the map.
- A compact filter bar (mobile-friendly, not a long row of chips) to filter
  by neighborhood (Marina / Cow Hollow), vibe, and current status.
- A light/dark mode toggle.

BARS TO INCLUDE (15, real SF bars)
Marina: Horseshoe Tavern, Bar Darling, The Tipsy Pig, Delarosa, The Dorian,
Rendezvous, Sully's Marina Lounge, Monaghan's Bar, The Patio
Cow Hollow: Balboa Cafe, The Brixton, Black Horse London Pub,
West Coast Wine & Cheese, Palm House, Wilder
Each bar has: name, address, neighborhood, a vibe tag (dive bar, cocktail
lounge, sports bar, neighborhood pub, wine bar, late night, tiki/tropical).

STATUS SYSTEM
Each bar has a capacity percentage and a wait time in minutes, color-coded:
green (under 50%, no wait), yellow (50-85%, short wait), red (85%+, line out
the door). Pins on the map and cards in the list use this same color coding,
and the map should visibly update to show only the bars that match the
active filters.

LIVE UPDATES WITH VERIFICATION
- Users must create an account (username + password) to post an update.
- Before a user can submit an update for a bar, the app must check their
  device's GPS location and confirm they are physically within about 300
  meters of that specific bar. If they're too far away, or deny location
  access, block the submission and explain why in plain language.
- The update form lets them set capacity (slider), wait time (minutes), an
  optional quick vibe note from a preset list, and a checkbox for "I work
  here" to mark it as an official owner update instead of a patron report.
- Every bar shows who posted the last update and how long ago ("@username,
  4 min ago" or "Owner update, 4 min ago"), and flags stale reports (no
  updates in 45+ minutes).
- Updates should be visible to all users of the app in real time (or on a
  short refresh interval), not just the person who posted them.

DESIGN DIRECTION
Light and lively, not a dark "tactical" dashboard look. Think: energetic SF
tech-startup feel — Golden Gate Bridge coral/orange as the primary accent
color, a bay-water teal/blue as the secondary color, soft off-white
backgrounds, rounded cards, a bold modern display font for headings. Avoid
generic dark-mode-only dashboards; this should feel like a fun consumer app
a young SF crowd would actually want to open before a night out.


```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
