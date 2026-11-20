# Bella Vista Hotel & Events Place

Next.js 16 website with an online reservation system and a staff dashboard.

The [project proposal, rubric evidence, and defense walkthrough](docs/project-defense.md) describe the submission and how to demonstrate it.

## Run it
Requires **Node 24.x**. SQLite is built into Node for local development.

```bash
npm install
cp .env.example .env.local     # set ADMIN_PASSCODE
npm run dev                    # http://localhost:3000   (staff: /admin)
npm run seed                   # optional: demo bookings, payments and reviews (+ a demo front-desk login)
npm test                       # business rules, database, reports, QR, migration
```
## Staff accounts
The first run creates an **administrator** account: username `admin`, password = `ADMIN_PASSCODE` (or `admin2026` when it isn't set, in development only). After that, passwords live in the database: change yours under **My account** and add people under **Staff**.

| Role | Can do |
|---|---|
| Administrator | Everything: reports, reviews, audit log, staff accounts |
| Front desk | Dashboard, timeline, new walk-in/phone bookings, payments, fines, reschedule, approve/cancel |

Every action in the audit log is recorded under the person's own username.

**Forgot password (staff):** on the sign-in screen, staff choose *Forgot password?* and enter their username. The request appears on the administrator's **Staff** page (with a count on the Staff tab); the administrator confirms it is really them, sets a new password and tells them. There is no email link. If the only administrator forgets their password, create a second administrator account in advance, or reset `ADMIN_PASSCODE` and delete the `admin` row from the `staff` table while the site is stopped.

## What's inside
| Area | Where |
|---|---|
| Pricing, validation, cancellation rule | `lib/rules.js` |
| SQLite storage (`data/bella-vista.db`, auto-created; imports an old `bookings.json` once) | `lib/db.js` |
| Booking logic, event packages, lookup, reviews (all inside one transaction, so no double-booking) | `lib/bookings.js` |
| Reports and CSV export | `lib/reports.js` |
| QR code generator (no dependency) | `lib/qr.js` |
| Guest pages | `/` · `/rooms/[slug]` · `/my-booking` · `/voucher/[id]` · `/terms` · `/privacy` |
| Staff pages | `/admin` (dashboard) · `/admin/timeline` · `/admin/reports` · `/admin/reviews` · `/admin/audit` |

## Features
- **Contact fields:** mobile number is a fixed `+63` plus exactly 10 digits (letters, symbols and extra digits are removed as you type; pasted `09…` or `+63…` numbers are tidied), and email must be a complete, valid address. The same rules run on the server.
- **Reservation Request System:** 3-step form, capacity rules from the spec (Standard 2 to 3, Family 4 to 5, Hall up to 40), live availability, price breakdown, 50% downpayment, Terms acceptance, 48-hour hold on pending requests.
- **Event Hall planner:** choose the occasion, add Family/Standard rooms for overnight guests in the same booking (one reference, one downpayment).
- **Guest booking lookup:** reference + email shows status, downpayment deadline and the free-cancellation date.
- **Booking voucher:** printable page with a QR code. Scanning it opens the booking in the staff dashboard.
- **Reviews:** verified guests (completed stays only) review; staff approve before publishing.
- **Downpayment tracking:** staff record payments (cash, GCash, bank), refunds and fines (such as the ₱2,000 no-smoking fine). A booking can only be confirmed once the downpayment is received, and the balance is calculated for you. Entries can't be edited or deleted.
- **Walk-in / phone bookings, rescheduling:** staff can create bookings (email optional) and move dates or units, with prices recalculated.
- **Guest cancellation:** guests cancel from the lookup page; cancelling 3+ days before check-in is flagged refundable and shows up as "refund due" for staff.
- **Admin timeline:** all 7 units across 28 days, colour-coded, with approve/cancel from the chart.
- **Reports:** revenue, occupancy, averages, by month/facility/weekday, CSV export, print to PDF.
- **Audit log:** bookings, status changes, review decisions, exports, staff sign-ins.

## Moving to another computer, and backups
Backups contain bookings, payments, staff accounts, settings, reviews, and audit history. Local databases live in `data/`; hosted deployments use Turso. The bundled gallery images live in the project.

1. On the old computer: **Admin > Settings > Backup and restore > Download backup**. Keep the `.zip` private (it holds guests' contact details and password hashes).
2. On the new computer: copy the project, create `.env` again (it is not in the backup), run `npm install` and `npm run dev` (or `npm run build` and `npm start`), then sign in as `admin` with the starting password.
3. **Settings > Backup and restore > Restore from a backup**, choose the `.zip`, check what it says is inside, tick the box and confirm. Everyone is signed out afterwards; sign in with an account from the backup.

A restore first saves what was on the site to `data/backups/before-restore-<date>.zip` (the last three are kept; set `BACKUP_DIR` to change the folder), so a wrong choice can be undone by restoring that file. Backups made by an older version restore into a newer one; the reverse is refused.

## Gallery photos
The project ships with a coordinated set in `public/experience/`. To add a photo through the project files, follow the category and filename rules in `public/gallery/README.txt`.

## Preparing Vercel and Turso

1. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as server-only variables in each Vercel environment. Use a separate database for previews.
2. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS address. Vercel's production project URL is the fallback when neither site URL variable is set.
3. Run `node scripts/turso-setup.mjs` against the intended database to create the schema. The setup command does not import bookings or seed accounts.
4. For an existing site, create a private ZIP from the local admin Backup screen. Preview it with `node scripts/turso-backup.mjs preview local-backup.zip`. Confirm the target database before importing with `node scripts/turso-backup.mjs restore local-backup.zip --confirm`. A restore replaces the target's operational data.
5. For a fresh site, set a strong `ADMIN_PASSCODE` for the first administrator and verify sign-in in the private deployment.

Hosted browser restores accept ZIPs up to 4 MiB. Use the server restore command above for larger archives. Hosted restores keep the three latest safety copies in Turso. Retrieve a named copy with `node scripts/turso-backup.mjs safety recovered.zip <safety-copy-name>`. The CLI can also export a fresh ZIP using `node scripts/turso-backup.mjs download backup.zip`. Keep a separate private copy outside the database.

## Before going live
- **Fill in `lib/contact.js`**: hotel phone, email, address and GCash/bank details. They appear in the footer, on the booking confirmation ("How to pay your downpayment"), the lookup page and the voucher. Empty fields are hidden.
- Have the hotel review the Privacy Notice (`app/privacy/page.jsx`) and add its own retention period if it has one.
- Verify that a test booking remains available after a redeploy and that the intended administrator can restore a backup.
- Keep an operational ZIP from **Admin > Settings > Backup and restore > Download backup**.
- Change the seeded demo passwords (`admin2026`, `frontdesk2026`) before real use.
- Hosted rate limits are shared through Turso. Local development uses in-memory limits.

## Speed
- **Judge speed with a production build**, not `npm run dev`: `npm run build` then `npm start`. Dev mode compiles on demand, ships unminified code and shows error overlays, so it is several times slower.
- The home page is cached for 60 seconds (and refreshed instantly when a review is approved).
- The booking form and Terms dialog load only when needed.
- Gallery photos are resized and served as AVIF/WebP automatically (`sharp` is installed with `npm install`).
- The public availability feed lists only current and future stays; the staff screens use an ETag so unchanged data costs a tiny 304 reply.

## Contact, payments and email
- **Contact and payment details:** sign in as an administrator and open **Settings**. Enter the hotel phone, email, address and how guests pay the downpayment (GCash, bank transfer, etc.). They appear on the booking confirmation, the guest lookup page, vouchers, the website footer and in emails. `lib/contact.js` only supplies the starting values.
- **First-login checklist:** administrators see "Finish setting up" at the top of the dashboard until the password is changed, contact and payment details are added, email is on and photos are added.
- **Email (optional):** set `SMTP_URL` and `MAIL_FROM` (see `.env.example`) and restart. Guests then get an email when they book and again when you confirm their stay, and can use **Lost your reference?** on the lookup page. Email never blocks a booking: if it fails, the booking is still saved. Without these settings nothing is emailed and the site says so honestly.
- **Booking holds:** a new request holds the dates for 48 hours. The exact deadline is shown on the confirmation, in the email and on the lookup page.

## Design
See `DESIGN.md` for the palette, type and component rules.

## Staff sign-out
Staff are signed out automatically whenever they go to the guest portal: the "Back to the website" logo link signs out first, any guest page opened in the same browser clears the staff session (`middleware.js`), and in-page navigation or the Back button is caught by `components/StaffGuard.jsx`. Each automatic sign-out appears in the audit log.

## Mobile
The guest site and the staff screens are built phone-first. Design rules used throughout:
- **Touch:** every button, link and field is at least 44px tall on a phone; fields are 16px so iPhones don't zoom in when you tap them.
- **Type and spacing:** section titles scale with the screen (`.h-sec`), small uppercase labels use `.eyebrow` (larger on phones), and phone sections use 20px side margins.
- **Navigation:** a sticky top bar, and a full-screen menu on phones. There is one Reserve button, in the sticky top bar (the hero has no second one and there is no phone bottom bar). Each room row has a "Book ..." link that preselects the stay type.
- **Rooms:** a rate card; each row stacks on phones.
- **Booking:** the price sits in a bar pinned to the bottom of the screen; the full breakdown appears on the review step.
- **Gallery:** one large lead photo with equal frames, no captions or filters, swipe left/right in the viewer.
- **Notches:** `viewport-fit=cover` plus safe-area padding (`.pb-safe`) keep content clear of the notch and home bar.
- **Staff:** scrollable tab bar, reservations as cards, a full-screen booking panel, and a 10-day timeline with unit names pinned.
