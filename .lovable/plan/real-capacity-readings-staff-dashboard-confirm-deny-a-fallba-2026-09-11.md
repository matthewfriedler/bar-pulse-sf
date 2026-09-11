# Real capacity readings: staff dashboard + confirm/deny + a fallback estimate

## One thing to know first about Google

Google does not publish the "popular times / live busy" graph through any paid or free API — it only exists inside Google Maps itself. So Google cannot be the source of an hourly busyness number. What Google *can* reliably give us, and what this plan uses it for:

- opening hours and "open right now"
- address, rating and review count (a rough size/popularity signal)

The historical fallback therefore comes from BarPulse's own accumulating history (average crowd level for that bar, that day, that hour), with Google used as the sanity check so we never show "packed" for a bar that is closed. Every fallback number is clearly labelled as an estimate and is the thing users confirm or deny.

## 1. Staff and owner readings

- New "claim this bar" flow: a signed-in person requests staff access to a bar, with a role (owner / manager / staff) and a short note. Requests start as pending and are approved from an admin view.
- New `/staff` page for approved staff: pick one of their bars and post a reading — crowd level, wait at the door, optional headcount at the door, and a vibe note. No GPS wall for approved staff, but their location is recorded when available.
- Staff readings are marked verified-staff, carry more weight in the live number, and show as "Staff reading" on the card with the bar's name, not a username.
- The staff page also shows their last readings for the night and how many people have confirmed or disputed each one.
- The existing "I work here" checkbox on the public report form stops granting staff weight — it now just requests a claim, so anyone can't self-declare.

## 2. Confirm or deny the current reading

- Every bar card and map popup gets a "Still accurate?" pair of buttons: "Yep" / "Way off".
- "Way off" opens a one-tap correction (quieter / busier), which posts a lightweight reading.
- Confirmations require an account and a GPS check within the existing 300 m radius.
- Confirmations feed the live number: agreements slow the decay of the current reading and raise confidence, disagreements drop confidence fast and pull the number toward the corrections.
- Card shows "12 confirmed, 2 disputed in the last hour".

## 3. Fallback estimate when nobody has reported

- A nightly-updated baseline per bar per day-of-week per hour, built from all past readings for that bar; when a bar has too little history, fall back to the neighbourhood average for that hour.
- Bars with no live signal show an estimate ("Usually filling up around now") in a visually distinct, muted style — never the same treatment as a live reading.
- Google supplies open/closed and hours, cached per bar for a day; a closed bar shows "Closed right now" instead of any estimate.
- Estimates always render the confirm/deny buttons, which is how the estimate turns into real data.

## Technical notes

- New tables: `bar_staff` (claims + approval state), `bar_reading_confirmations` (agree/disagree per reading), `bar_baselines` (bar, dow, hour, avg capacity, sample count), `bar_google_cache` (hours, rating, fetched_at). All with grants, RLS, public read where appropriate, writes scoped to `auth.uid()`.
- `bar_updates` gains a `source` column (`patron` | `staff` | `correction`) and staff weight comes from `bar_staff`, not from the client-sent `is_owner` flag; a trigger validates it.
- Baseline refresh runs as a SQL function over `bar_updates`, called from a server function rather than a cron job at first.
- Google calls go through the connector gateway from a server function (Places API New: `places/v1/places/{placeId}` with a field mask for hours and rating), cached in `bar_google_cache`; `bars` gains a `google_place_id` column resolved once via text search. Requires connecting the Google Maps connector.
- Consensus engine in `src/lib/barpulse.ts` extends to take confirmations and a baseline, and returns a `basis` of `live` | `estimate` | `closed`.

## Not included

- Automated admin approval (first pass approves claims from an admin page you use).
- Push notifications, sensors, or POS integrations.
