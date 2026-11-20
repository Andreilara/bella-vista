# Bella Vista: design system

**Idea.** A small mountain hotel and event hall at the foothills. Warm paper, pale sage panels, one pine-green accent and a deep forest night. The landing page is a Persuade surface; the booking form and staff screens stay plain and fast. (Redesigned November 2026: palette, copy, layout and photography below the hero; the hero itself is deliberately kept as it was.)

**Signature (the hero, redesigned).** A full-screen dark hero after the client's reference: the Cover photo fills the right and bleeds into the `night` ground (a CSS mask fades its left edge, and on phones its bottom edge; a soft shade sits under the text), so photo and words read as one picture. Text sits bottom-left, the top bar floats transparent over it and turns solid paper once the hero scrolls away. Until a Cover photo exists the dusk illustration fills the same space. The old arch was removed; the offset tile-pattern frame behind it was removed in November 2026, so no pattern grounds remain anywhere. Elsewhere photographs sit in flat, square-cornered frames with no captions. The one type moment is the place name set large in the footer.

**Modes.** Landing page: Persuade. Booking form, guest lookup, staff screens: Operate. Terms, privacy, room pages: Read.

## Tokens (`tailwind.config.js`)
Token names are unchanged from the earlier palette so the staff screens needed no edits; `tile` / `tilehi` are simply the accent, now pine green.
| Token | Value | Use |
|---|---|---|
| `paper` | #f6f2e9 | page, hero, gallery, reserve |
| `surface` | #fcfaf5 | The House section, cards, fields, raised panels |
| `fog` | #e7e9dd | pale sage panels (rooms, guest notes) |
| `ink` | #1e2420 | text |
| `ash` | #545b55 | secondary text (6.3:1 on paper, 5.7:1 on fog) |
| `line` | #dcd6c6 | hairlines |
| `tile` / `tilehi` | #2c5a42 / #1f4431 | the one accent: primary actions, links, selection, focus ring (7.1:1 on paper) |
| `night` | #14231b | footer and photo viewer; paper text on it is 14.6:1 |
| `glow` | #a8cdb3 | pale sage accent on night (9.4:1) |
| `ridge` | #6b7d70 | quiet bars in reports |

The hero illustration keeps its own warm lamp-lit windows (amber, hard-coded in `HeroArt.jsx`); its sky, hills and clouds use the greens above.

All hues sit between 40 and 150 degrees (warm paper to green): no blue, no violet. Section grounds alternate flat: hero paper, The House surface, Rooms fog, Gallery paper, Guest notes fog, Reserve paper, footer night.

Status colours (pending/confirmed/completed/cancelled) use Tailwind amber/emerald/sky/red at 100 (fill) and 900 (text), or 400 on the timeline. The accent is a deeper green than the emerald status colour, and the status pills also carry text labels, so colour is never the only signal.

## Type
**Pairing.** Display: **Cormorant Garamond** (variable, weights 300 to 700; `font-display`, `.h-sec`, `.hero-title`): a refined, high-contrast serif that reads as boutique-hotel and holds its hairlines at large sizes. Body and UI: **Manrope** (variable) at 16px / 1.65: open, even and clear at small sizes and in forms, with tabular figures. Both are self-hosted (no external requests): the Latin and Latin Extended files (Latin Extended carries the peso sign) live in `public/fonts`, declared in `app/fonts.css` (generated from the `@fontsource-variable` packages), and the two Latin files are preloaded in `app/layout.jsx`.
**One scale, used everywhere** (`globals.css`). Tokens: `--fs-hero` (4 to 10rem), `--fs-h2` (2.5 to 4.25rem, `.h-sec` section titles), `--fs-lead` (1.5 to 2.25rem). Heading classes for everything else: `.h-xl` (page titles, 2.75 to 4rem) > `.h-lg` (admin page titles, card titles, 2.25 to 3rem) > `.h-md` (sub-headings, 1.75 to 2rem) > `.h-sm` (small headings, 1.5rem). Pages no longer set ad-hoc `text-2xl` / `text-4xl` sizes on serif headings; use these.
**Rules.**
- The serif is for 1.375rem and up. Anything smaller is Manrope. Large serif sits at weight 500 to 600; small serif at 600 so the hairlines hold.
- Serif figures are lining (`font-variant-numeric: lining-nums`), so prices and dates never read as old-style numerals. Booking references, money and dates in tables stay in Manrope with tabular figures.
- Headings: tight line-height (1.02 to 1.12), slight negative tracking, balanced wrapping. Body paragraphs wrap with `text-wrap: pretty`. No letter-spaced uppercase labels.
- Hierarchy on the hero: (1) `.hero-title` "Bella Vista", Cormorant 600, 4 to 10rem, cream; (2) `.hero-sub` Manrope 500, 1.125 to 1.5rem, two balanced lines (first letter capitalised in CSS; the DOM text stays "Bella Vista: a small hotel and event hall at the mountain foothills"); (3) 16 to 18px body copy; (4) one pill button. Tiers 1 and 2 share one `<h1>`.
- The logo wordmark is semibold (600); the footer wordmark is a quiet medium (500) at 30% opacity, decorative only.

## Logo (the hotel's logo, supplied November 2026)
**Mark.** The house in front of three mountains, with "BELLA VISTA" (an arched doorway between the two words, on a ground line) and "HOTELS AND EVENTS PLACE" beneath. It is one pine colour with no other tones, traced from the supplied PNG into vector paths (`public/brand/logo.svg`), so it stays sharp at any size.
**Dynamic colour.** The SVGs are used as CSS masks (`components/Logo.jsx`), so the logo has no colour of its own: it takes `--logo`, set in `app/globals.css` to pine (`#2a4a36`, the artwork's own colour) on paper and to pale sage (`glow`, `#a8cdb3`) inside any `.on-dark` area (the hero, the transparent nav over it, the footer, the photo viewer). Anything placed in an `.on-dark` section therefore contrasts automatically. `accent` overrides it; `accent="currentColor"` follows the surrounding text colour (used for the empty photo frame). The mask carries `print-color-adjust: exact` so it prints on vouchers.
**Lockups.** `Logo` (bars, headers, vouchers) is the house-and-mountains mark (28px tall on phones, 40px from `sm`) plus the live "Bella Vista / Hotel & Events Place" wordmark, because the name inside the full artwork is too small to read at bar height. `Logo large` / `LogoFull` (staff sign-in) is the complete artwork at 128 to 144px tall, where the name is legible. `LogoMark` is the house and mountains alone (empty photo frame).
**Files.** `public/brand/logo.svg` (full artwork, master) and `logo-mark.svg` (house and mountains only) are the vector masters, both pine. `public/brand/social-profile-800.png` (full logo on paper), `app/icon.png` (512px) and `app/apple-icon.png` (180px; paper mark on a pine tile) are rasters drawn from the same paths. The social preview image (`app/opengraph-image.png`) uses the mark; the schema.org logo uses `logo.svg`.
**Source quality.** The SVG was traced from an 800px PNG at sub-pixel accuracy (average 0.12px from the source edges, nowhere more than about 1px, at the sharpest serif tips). If the designer has the original vector, replace `logo.svg` and `logo-mark.svg` with it (keep them single-colour, one path, and update the two ratios at the top of `components/Logo.jsx`; `tests/logo.test.mjs` checks them).
**Rules.** Clear space of a quarter of the mark's height around it. Minimum sizes: the full logo 96px tall (below that use the `Logo` lockup), the mark 24px tall. Do not recolour outside the palette, add a frame or shadow, or stretch it.

## Elevation (shadows)
Four soft, warm-green-tinted shadows (never pure black), defined in `tailwind.config.js`: `shadow-soft` (resting: cards, photo frames, gallery frames), `shadow-lift` (the hero arch, and photos on hover), `shadow-btn` (filled buttons, tinted pine), `shadow-nav` (the sticky top bar). `.card` carries `shadow-soft`, so every raised panel (booking form, review cards, room facts, staff panels) shares it. Hover raises a linked photo from soft to lift; nothing else on the page casts a shadow. All shadows are removed in print.

## Components (`globals.css`)
`.btn` the one filled action (`.btn-light` on night sections) · `.pill` quiet outline button · `.fld` boxed field · `.lbl` field label · `.card` raised panel. Corners are 6px (`rounded-md`). Touch targets are 44px on phones; fields are 16px so iOS doesn't zoom.

## Rules
- One filled `.btn` per view where possible; everything else is `.pill` or a link.
- No gradients, glass blur, ghost numerals, numbered eyebrows or letter-spaced uppercase labels.
- **Photographs** (everywhere except the kept hero arch): square corners, no caption under or over any image (alt text carries the description), no photograph shown twice on the home page (`lib/photos.js` assigns them: the cover is the hero, then one per room type from its own category, then The House, then the gallery). A slot with no photo shows a quiet frame with the logo mark, never a label. The hero shows the dusk illustration until a cover photo exists. Controls keep the 6px radius.
- **Equal edges:** the nav, every section and the footer sit in one `.wrap` (max 1336px with padding), so left and right edges match at every width. Each section is one or two screens tall; the hero fills exactly one.
- **Motion** (CSS only, transform and opacity; off for `prefers-reduced-motion` and in print): on load, once, the hero text rises, the hero arch opens like a window and its shadow fades in; the arch drifts slightly on scroll and the illustration's stars, windows, fireflies and clouds move gently (all kept from the original hero). On hover, links draw underlines, linked photographs zoom 1.03 inside their frame, gallery frames lift 2px, buttons step and press. On scroll, nothing moves except one moment inside its own section: the intro words in The House darken one by one (`.wh`, needs `animation-timeline`; where unsupported the words simply stay dark). Apart from the hero arch's drift there is no parallax, progress bar, or fade-in on scroll.
- **Reserve:** exactly one Reserve button on the home page, in the top bar (it is sticky on every screen size). The hero's single button is the ink-coloured "See rooms and rates" (it scrolls to the rooms, so it never reads as a second Reserve); there is no phone bottom bar and no Reserve link in the footer. Rooms offer a "Book Standard Rooms / Family Rooms / the Event Hall" link that preselects the stay type; room pages (which have no top bar) carry their own "Reserve ..." button linking to `/?stay=std#reserve` (also `fam`, `hall`).
- **Copy:** the original brand wording is kept on purpose (premier eco-chic boutique, sanctuary, warm Filipino hospitality, the 2021 / Growing demand / Today story). Only the hero heading and the plain-fact lines (rates, capacities, hours) were added in the November 2026 redesign.
- **The Settings address** shows on the page and feeds the "Get directions" link: enter street and district only.
- Real photos are the single biggest upgrade still available. Upload at least 12: a cover, at least one each of Rooms, Family Rooms and Event Hall, one of Grounds, and nine or more others.

## Gallery (redesigned November 2026, mosaic revision)
An editorial mosaic on a 6-column grid with equal edges and a fixed row height (14rem on large screens): a wide 4x2 lead beside a 2x2 portrait, then a portrait beside four 2x1 frames (7 photos, four rows) or three 2x1 frames (5 photos, three rows). Phones: 2 columns, the lead spans both. The count shown always fills whole rows (7, 5, or fewer); when there are more photos, the last frame becomes a flat "+N / View all photos" door into the viewer (no gradient). Frames carry no caption, per the photograph rules; hover or focus reveals a small expand button, and the title and counter live in the viewer. The viewer is solid `night` with a header (title, "3 of 12", round close button), round previous/next buttons, a thumbnail filmstrip that follows the current photo, swipe, arrow keys, and a focus trap. No filter tabs. With no photos the Gallery section and its links are hidden.
The bundled concept photos live in `public/experience`. A Cover photo feeds the hero. Rooms, Family Rooms, and Event Hall photos feed their showcase and detail pages. Grounds feeds The House, with Dining as a fallback. The remaining photos appear in the Gallery. Files in `public/gallery` can still supply additional photos through the project.

## Staff sign-in
Visible labels (never placeholder-only), a show-password toggle (icon button, `aria-pressed`, 48px wide) and "Forgot password?". There is no self-service reset and no email link: the request appears on the administrator's Staff page (and as a count on the Staff tab), and the administrator sets a new password. The response never reveals whether a username exists.

## Accessibility
The earlier audit (axe-core 4, 28 page states, 0 violations) predates the November 2026 landing-page redesign and the new palette, so **re-run it before launch**. Numbers below were checked by calculation, not by a scan.
- **Contrast:** all text pairs ≥ 4.5:1 (secondary text 5.7-6.7:1); field and button borders use `ink/55` (3.5:1) to meet 1.4.11; focus ring is `tile` (≥ 6.4:1 on every light surface).
- **Keyboard:** skip link; visible focus on every control; all four dialogs (phone menu, photo lightbox, Terms, staff booking panel) trap focus, close on Esc and return focus to the control that opened them (`components/useFocusTrap.js`).
- **Reflow:** no horizontal scroll at 320px, including with WCAG text-spacing overrides.
- **Targets:** every control is ≥ 44px tall on phones, except inline text links in sentences.
- **Names:** an accessible name always contains the visible text (WCAG 2.5.3): keep this when adding `aria-label`s.
- **Not covered by tools:** screen-reader listening tests (VoiceOver, TalkBack, NVDA) and real-device testing. Do these before launch.

## Guest journey (critique fixes, November 2026)
- **Dates are chosen in the booking form** (the hero no longer carries a date card). The form says which stay types are fully booked for the chosen dates; "Book this room" opens it with that stay type selected.
- **Confirmation leads with payment:** deadline, how to pay, then a copy/share button; the voucher and tracking links are secondary. It never promises an email unless email is configured.
- **Honest wording:** the final button is "Request reservation" and the review step states the 48-hour hold before the guest commits.
- **Errors:** the form moves focus to the first field that needs fixing (details step) or scrolls the message into view.


## Delivery and security (November 2026)
- **Caching.** Guest pages refresh on a 60-second interval (`revalidate = 60` in `app/layout.jsx`). Settings changes and review moderation invalidate affected guest content. Staff data, booking API calls, and vouchers are dynamic.
- **Headers** (`next.config.mjs`): X-Frame-Options DENY, `nosniff`, Referrer-Policy, Permissions-Policy, COOP everywhere; in production also a Content-Security-Policy (own scripts, styles, images, fonts only; no framing; inline scripts and styles allowed because Next.js needs them) and HSTS (6 months). If you add an embed, map, analytics or font from another site, add its host to the policy.
- **Site address.** `npm run build` stops unless `NEXT_PUBLIC_SITE_URL` is a real address (`scripts/check-site-url.mjs`); `SITE_URL` can override it when the server starts. `robots.txt` and the sitemap read it at request time.
