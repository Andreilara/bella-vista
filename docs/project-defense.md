# Bella Vista reservation system

Bella Vista began as a family-owned resthouse in 2021 and grew into a boutique hotel and events venue. The website lets guests browse the property, check availability, and request a reservation. The staff dashboard gives hotel personnel one place to manage room and hall bookings, record payments, monitor the calendar, and review revenue.

## Rubric evidence

| Criterion | Where to demonstrate it |
|---|---|
| System functionality and business logic · 35 pts | Open the homepage and reserve a stay. Compare quotes at the capacity boundaries, then approve a request from the staff dashboard after recording the downpayment. Open Timeline to see room and hall availability and Reports to see bookings and revenue. |
| UI/UX and branding · 25 pts | Show the custom mountain logo, pine and paper palette, and the responsive homepage. On a narrow screen, swipe through Rooms & Hall and open the gallery. Follow a room’s reservation link through Stay, Guest details, and Review. The bundled photos are concept imagery. |
| Database and backend · 20 pts | Show the same reservation in My Booking and the staff dashboard, then refresh after recording payment. Explain that production uses Turso, development uses SQLite, and competing reservations are checked and written in one transaction. |
| Documentation and presentation · 20 pts | Show The House and the 2021 company history. Open Terms before submission and point out the downpayment, cancellation, damage, no-smoking, and quiet-hours policies. Use the walkthrough below for the group defense. |

## Business rules

| Inventory | Capacity | Nightly rate |
|---|---|---|
| Room A, Room B, Room C | 2–3 guests per room | ₱3,500 for two, plus ₱1,000 for the third |
| FR1, FR2, FR3 | 4–5 guests per room | ₱6,000 |
| Event Hall | Up to 40 guests | ₱15,000 for up to 30, plus ₱500 per additional guest |

The hotel operates every day, with check-in at 2:00 PM and checkout at noon Philippine time. A completed stay can be recorded from noon on the checkout date. Bella Vista uses a 50% downpayment and a 48-hour pending hold. The rest is due at check-in. Cancellations less than three days before check-in are non-refundable. Smoking inside a guest room incurs a ₱2,000 fine, guests are liable for damage, and quiet hours start at 10:00 PM.

## Architecture and defense walkthrough

The Next.js guest and staff screens call API routes on Vercel. Shared business logic validates dates and capacities and computes prices. Turso stores reservations, payments, staff accounts, and audit entries. Staff permissions are checked by the server. The availability feed exposes occupied units and dates.

1. Use an isolated demo database. On desktop and mobile, show The House, Gallery, and Rooms & Hall, then start a Standard Room booking.
2. Select three guests for one night and show the ₱4,500 total. Try four guests and show the disabled Continue control. Open the terms, accept them, submit, and save the reference.
3. Sign in as staff. Find the request on Dashboard and Timeline, record the ₱2,250 downpayment, then confirm it. Refresh and look it up as a guest using the reference and email.
4. Start a hall booking for 40 guests and show the ₱20,000 nightly quote. Try 41 guests and show the validation. Explain why the server rechecks availability when saving.
5. Sign in as an administrator and open Reports. Point out the booking and revenue summaries and explain which controls Front Desk can access.

Complete the instructor’s cover sheet with the group number, names, and actual roles before submitting. The live demonstration and defense are graded by the instructor.
