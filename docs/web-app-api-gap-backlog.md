# Web app backlog: server APIs still missing a screen

Work for the next web developer. The Nest server in `server/src` already exposes these APIs. The Next.js app in `web/` does not use them, or it only has a client function that no page calls.

## Rules

**One feature, one branch, one pull request.** Do not combine features on a branch. Do not stack a later feature on an earlier feature branch. Branch from the current default branch every time.

Branch names:

```text
feature/web-<slug>
```

Example: `feature/web-leave`.

Each branch should include:

- `web/api/endpoints/<feature>.ts` and types
- a hook under `web/api/hooks`
- the page under `web/app`
- a sidebar entry in `web/lib/access.ts` when the feature is a new route
- access checks that match the server `@Roles` on that controller

Copy the page shape from Claims or Leads: filters bar, `*-content.tsx`, loading and error states, shadcn components.

Leave these on the mobile app. They need a device:

- clock in, clock out, and breaks
- GPS batch posting
- driver proof of delivery (arrive and submit)
- opening and closing a store inside the branch geofence

Also skip inbound-only routes: Clerk webhooks, Yeastar call webhooks, `POST /communication/send-app-update-notification`, `GET /debug/ping`, and `/loyalty/external/*` (POS API key).

News, rewards, and loyalty are `@EnterpriseOnly` on the server. Hide those routes unless the organisation has that entitlement.

## Already on the web

Do not rebuild these. Home, staff (including payroll hours and attendance edits), visits, leads, pipeline, clients, claims (including share links), takeoff, deliveries, the store-operations dashboard, assets, approvals list and approve/reject, payslips view, planning and route calculation, reports (targets, policy, call quality, insights, tasks, leads activity), performance, competitors, Competitor Overview, wellbeing, IoT device list, settings (hours, branches, calendar, notices, banners, performance policy, call quality, Apify jobs), and the client store, orders, and projects.

## Order

Ship in this order. Each row is its own branch.

1. Leave
2. Warnings inbox
3. Attendance report sends
4. Merchandise inspections
5. Task flags
6. Visit dispatch and lead conversion
7. Client interactions and schedules
8. Quotation conversion
9. IoT reports
10. Store session review
11. Approvals lifecycle
12. Documents library
13. Feedback inbox
14. Geofences
15. ERP import
16. ERP health
17. Usage and licenses
18. Outbound webhooks
19. Payslip import
20. Product admin
21. News
22. Sales tips
23. Resellers
24. Rewards leaderboard
25. Loyalty admin
26. Extra reports
27. Site opportunities from the server
28. Settings leftovers
29. Intake WhatsApp
30. Call admin tools

---

## 1. Leave

**Branch:** `feature/web-leave`

**API:** `server/src/leave/leave.controller.ts`

`POST /leave`, `GET /leave`, `GET /leave/report`, `GET /leave/:ref`, `GET /leave/user/:ref`, `PATCH /leave/:ref`, `PATCH /leave/:ref/approve`, `PATCH /leave/:ref/reject`, `PATCH /leave/:ref/cancel`, `DELETE /leave/:ref`.

**Build:** `/leave`. Request leave, filter by person, status, and dates, open a request, approve, reject, or cancel. `getLeaveList` and `useLeaves` exist and no page calls them. The phone app already has HR leave.

**Access:** HR, admin, manager, owner. A standard user can see and cancel their own requests.

## 2. Warnings inbox

**Branch:** `feature/web-warnings`

**API:** `server/src/warnings/warnings.controller.ts`

`GET /warnings`, `GET /warnings/:ref`, `GET /warnings/user/:ref`, `POST /warnings`, `PATCH /warnings/:ref`, `DELETE /warnings/:ref`.

**Build:** `/warnings`. Organisation list with status filters, detail, create, edit, delete. Creating a warning on a staff profile already works (`user-warnings-card.tsx`). Keep that card and have it land in this list. The phone app already has HR warnings.

**Access:** HR, admin, manager, owner.

## 3. Attendance report sends

**Branch:** `feature/web-attendance-reports`

**API:** `server/src/attendance/attendance.controller.ts`

`GET /att/daily-overview`, `POST /att/reports/morning/send`, `POST /att/reports/evening/send`, `POST /att/reports/absence-daily/send`.

**Build:** Actions on the existing Staff page. Show the daily overview, then buttons to send the morning, evening, and absence reports. Payroll hours and editing a day's times already exist. Do not add clock-in.

**Access:** Same roles that can manage staff attendance.

## 4. Merchandise inspections

**Branch:** `feature/web-inspections`

**API:** `server/src/journal/journal.controller.ts`

`POST /journal/inspection`, `GET /journal/inspections`, `GET /journal/inspection/:ref`, `GET /journal/templates`, `POST /journal/calculate-score/:ref`.

**Build:** An Inspections tab on `/merchandise`. Pick a template, score the checklist, attach photos, show the calculated rating. The current page is journal create, edit, and delete only.

**Access:** Same roles that can open Merchandise.

## 5. Task flags

**Branch:** `feature/web-task-flags`

**API:** `server/src/tasks/tasks.controller.ts`

`POST /tasks/flags`, `POST /tasks/flags/:flagId/comments`, `GET /tasks/:taskId/flags`, `GET /tasks/flags/:flagId`, `PATCH /tasks/flags/:flagId`, `PATCH /tasks/flag-items/:itemId`, `DELETE /tasks/flags/:flagId`, `GET /tasks/flags/reports`.

**Build:** Flags on a planning task. List, create, comment, update items, and a small flags report. `web/api/endpoints/tasks.ts` already has the calls. Planning never uses them. The phone app has a flags screen. Route calculation on Planning stays as it is.

**Access:** Same roles that can open Planning.

## 6. Visit dispatch and lead conversion

**Branch:** `feature/web-visit-dispatch`

**API:** `server/src/check-ins/check-ins.controller.ts`

`GET /check-ins/dispatch-summary`, `POST /check-ins/:checkInId/note-draft`, `POST /check-ins/:checkInId/convert-to-lead`.

**Build:** On `/visits`, show planned versus completed visit plans, draft a visit note, and turn a check-in into a lead. The dispatch-summary hook exists and no screen calls it. Convert-to-lead and note-draft have no web client.

**Access:** Same roles that can open Visits. Converting a check-in follows the leads create role on the server.

## 7. Client interactions and schedules

**Branch:** `feature/web-client-activity`

**API:** `server/src/interactions/interactions.controller.ts`, `server/src/clients/clients.controller.ts`

`GET /interactions/client/:ref`, `POST /interactions`, `PATCH /interactions/:ref`, `DELETE /interactions/:ref`.

`GET /clients/profile/communication-schedules`, `PATCH /clients/profile/communication-schedules/:scheduleId`, `DELETE /clients/profile/communication-schedules/:scheduleId`, `GET /clients/my-communication-schedules`.

**Build:** On the client detail page, an interactions feed (same idea as lead chat) and a communication-schedules editor. `GET /clients/nearby` can be a follow-up on this same branch only if it stays inside the client detail map. Do not start a new map product.

**Access:** Same roles that can open Clients.

## 8. Quotation conversion

**Branch:** `feature/web-quotation-conversion`

**API:** `server/src/shop/controllers/quotation-conversion.controller.ts`

`POST /quotations/:id/convert`, `GET /quotations/:ref/conversion-status`, `POST /quotations/:ref/conversion/rollback`.

**Build:** Convert and undo on a LORO quotation in Pipeline, and the same actions on the client portal order view. Pipeline already shows converted counts. It does not call these routes.

**Access:** Staff who can open Pipeline. Client portal users can see status on their own quotation. Rollback stays with staff roles from the controller.

## 9. IoT reports

**Branch:** `feature/web-iot-reports`

**API:** `server/src/iot/iot.controller.ts`

`GET /iot/analytics/summary`, `GET /iot/reports/morning`, `GET /iot/reports/evening`, `GET /iot/reports/device-timings/:deviceId`.

**Build:** A reports panel on the existing IoT device dialog, plus an org summary on `/iot`. The page currently lists devices only.

**Access:** Same roles that can open IoT.

## 10. Store session review

**Branch:** `feature/web-store-session`

**API:** `server/src/store-operations/store-operations.controller.ts`

`GET /store-operations/session`, `GET /store-operations/activity`, `GET /store-operations/stock-take`.

**Build:** From a store row on `/store-operations`, open that branch's session, activity, and stock-take lines. Opening and closing the store stays on the phone (`POST /store-operations/open` and `close`).

**Access:** Same roles as `canAccessStoreOperations`.

## 11. Approvals lifecycle

**Branch:** `feature/web-approvals-lifecycle`

**API:** `server/src/approvals/approvals.controller.ts`

`POST /approvals`, `POST /approvals/:id/submit`, `POST /approvals/:id/sign`, `POST /approvals/:id/withdraw`, `POST /approvals/:id/archive`, `GET /approvals/:id/history`, `GET /approvals/:id/signatures`, `POST /approvals/bulk-action`, `GET /approvals/my-requests`, `GET /approvals/pending`.

**Build:** On the existing Approvals page and detail dialog. Create, submit, sign, withdraw, archive, history, signatures, bulk action, and a My requests filter. List, approve, and reject already work.

**Access:** People who can manage approvals, plus the requester for their own requests.

## 12. Documents library

**Branch:** `feature/web-documents`

**API:** `server/src/docs/docs.controller.ts`

`POST /docs`, `GET /docs`, `GET /docs/:ref`, `GET /docs/user/:ref`, `GET /docs/download/:ref`, `PATCH /docs/:ref`, `POST /docs/remove/:ref`, `POST /docs/bulk-upload`.

**Build:** `/documents`. List, filter, download, and attach documents to a user. `POST /docs/upload` already runs from visits, claims, merchandise, and the logo field. Keep those uploads. This controller is enterprise-gated on claims.

**Access:** Admin, manager, owner, and anyone the controller allows to read their own documents.

## 13. Feedback inbox

**Branch:** `feature/web-feedback`

**API:** `server/src/feedback/feedback.controller.ts`

`GET /feedback`, `GET /feedback/stats`, `GET /feedback/:id`, `PATCH /feedback/:id`, `DELETE /feedback/:id`, `POST /feedback`.

**Build:** `/feedback`. Inbox, stats, status updates. Settings already stores `feedbackTokenExpiryDays`. Leave that field on Settings.

**Access:** Admin, manager, owner. Match the controller for who may submit.

## 14. Geofences

**Branch:** `feature/web-geofences`

**API:** `server/src/tracking/geofence.controller.ts`

`POST /geofence`, `GET /geofence`, `GET /geofence/areas`, `GET /geofence/:ref`, `PATCH /geofence/:ref`, `DELETE /geofence/:ref`, `GET /geofence/events/user/:userref`, `GET /geofence/events/geofence/:geofenceref`.

**Build:** `/geofences`, and show the areas on Competitor Overview. Create, edit, delete areas, and list entry events. Settings only stores the default radius. Competitor geofence fields on the competitor form are a different feature. Leave them alone.

**Access:** Admin and manager can edit. Other staff roles that the controller allows can view.

## 15. ERP import

**Branch:** `feature/web-erp-import`

**API:** `server/src/erp-importer/erp-importer.controller.ts`

`POST /erp-importer/import`, `GET /erp-importer/import-runs/:runId`, `GET /erp-importer/import-runs/:runId/results`.

**Build:** A Settings section. Run an import and show the run result table.

**Access:** Admin, owner, developer. Those are the controller roles.

## 16. ERP health

**Branch:** `feature/web-erp-health`

**API:** `server/src/erp/erp.controller.ts`

`GET /erp/health`, `GET /erp/stats`, `GET /erp/cache/stats`, `GET /erp/cache/health`, `GET /erp/connection/health`, `GET /erp/connection/pool`, `POST /erp/sync/:type/:uid`, `POST /erp/cache/warm`, `POST /erp/cache/refresh`, `POST /erp/cache/clear`.

**Build:** A Settings section for connection health, cache, and a manual sync. Profile sales, store sales, product sales, commissions, and team targets are already on Reports and Pipeline. Do not rebuild those charts.

**Access:** Admin, owner, developer.

## 17. Usage and licenses

**Branch:** `feature/web-usage`

**API:** `server/src/usage-tracking/usage-tracking.controller.ts`

`GET /usage-tracking/events`, `GET /usage-tracking/analytics`, `GET /usage-tracking/summaries`, `GET /usage-tracking/license-usage/:orgId`.

**Build:** `/usage`. Analytics, summaries, and license usage. Skip `POST /usage-tracking/events`. The server records those itself.

**Access:** Admin, owner, manager where the controller allows the read. License usage follows the controller.

## 18. Outbound webhooks

**Branch:** `feature/web-webhooks`

**API:** `server/src/webhooks/webhooks.controller.ts`

`POST /webhooks/subscriptions`, `GET /webhooks/subscriptions`, `DELETE /webhooks/subscriptions/:uid`.

**Build:** A Settings tab. Add a subscription, list them, delete one. Show the signing secret once on create.

**Access:** Admin and owner, matching the controller.

## 19. Payslip import

**Branch:** `feature/web-payslip-import`

**API:** `server/src/payslips/payslips.controller.ts`

`GET /payslips/import/gcs/preview`, `POST /payslips/import/gcs`.

**Build:** Import from storage on the existing `/payslips` page. Preview first, then confirm. Viewing and downloading a payslip already works.

**Access:** Same roles that can manage payslips.

## 20. Product admin

**Branch:** `feature/web-products`

**API:** `server/src/products/products.controller.ts`

`POST /products`, `POST /products/bulk`, `PATCH /products/bulk`, `GET /products`, `GET /products/:ref`, `PATCH /products/:ref`, `DELETE /products/:ref`, `PATCH /products/restore/:ref`, `GET /products/analytics/:id`.

**Build:** `/products` for staff. Create, edit, archive, restore, bulk edit, and a simple analytics view. The client store only reads the catalogue. Skip `POST /products/cart/:id`, `POST /products/wishlist/:id`, and `POST /products/view/:id`.

**Access:** Admin, manager, owner.

## 21. News

**Branch:** `feature/web-news`

**API:** `server/src/news/news.controller.ts`

`POST /news`, `GET /news`, `GET /news/:ref`, `PATCH /news/:ref`, `DELETE /news/:ref`.

**Build:** `/news`. List and editor. Enterprise only.

**Access:** Roles on the controller. Hide the route when the org is not entitled.

## 22. Sales tips

**Branch:** `feature/web-sales-tips`

**API:** `server/src/sales-tips/sales-tips.controller.ts`

`GET /sales-tips/tip-of-the-day`, `GET /sales-tips`, `GET /sales-tips/:id`, `POST /sales-tips`, `PATCH /sales-tips/:id`, `DELETE /sales-tips/:id`.

**Build:** `/sales-tips` for admin edit, and tip of the day on Home. `getSalesTips` exists and nothing calls it. Skip `POST /sales-tips/trigger-broadcast` unless the controller role is an explicit admin action on the same page.

**Access:** Everyone who can open Home sees the tip. Create and edit follow the controller.

## 23. Resellers

**Branch:** `feature/web-resellers`

**API:** `server/src/resellers/resellers.controller.ts`

`POST /resellers`, `GET /resellers`, `GET /resellers/:ref`, `PATCH /resellers/:ref`, `PATCH /resellers/restore/:ref`, `DELETE /resellers/:ref`.

**Build:** `/resellers`. List, create, edit, archive, restore. `getResellers` exists and nothing calls it.

**Access:** Admin, manager, owner.

## 24. Rewards leaderboard

**Branch:** `feature/web-rewards`

**API:** `server/src/rewards/rewards.controller.ts`

`GET /rewards/leaderboard`, `GET /rewards/rankings`, `GET /rewards/user-stats/:reference`.

**Build:** `/rewards`. Leaderboard and a person's XP. Enterprise only. Skip `POST /rewards/award-xp` on the first pass unless a manager screen is required. If you include it, it stays on this branch.

**Access:** Staff who can open Home can see the board if the org is entitled. Awarding XP follows the controller.

## 25. Loyalty admin

**Branch:** `feature/web-loyalty`

**API:** `server/src/rewards/loyalty.controller.ts` staff routes only.

`GET /loyalty/profiles`, `GET /loyalty/rewards`, `POST /loyalty/rewards`, `GET /loyalty/analytics`, `GET /loyalty/transactions`, `GET /loyalty/broadcast/history`, `POST /loyalty/rewards/:rewardId/claim` for the signed-in member profile views that the controller allows.

**Build:** `/loyalty`. Profiles, reward catalogue, analytics, claim history. Do not call `/loyalty/external/*`.

**Access:** Admin and manager for the catalogue and analytics. Enterprise only.

## 26. Extra reports

**Branch:** `feature/web-extra-reports`

**API:** `server/src/reports/reports.controller.ts`

`GET /reports/targets-progress`

`GET /reports/travel-day/me`, `GET /reports/travel-day/me/latest`, `POST /reports/travel-day/me/claim`

`GET /reports/user/:userId/daily-reports`, `GET /reports/user/:userId/highlights`

`GET /reports/organization/:organisationRef/daily-reports`, `GET /reports/organization/metrics`

**Build:** New sections on `/reports`. A rep can open their travel day and claim it. Managers can open daily reports and highlights for a person and for the organisation. Staff travel export already exists. Do not replace it.

**Access:** Reports access. Self routes for the signed-in user. Org routes for elevated report roles.

## 27. Site opportunities from the server

**Branch:** `feature/web-site-opportunities`

**API:** `GET /reports/site-opportunities` in `server/src/reports/reports.controller.ts`.

**Build:** Competitor Overview currently calculates zones in the browser (`web/lib/site-opportunity`). Load zones from this endpoint so the map and the server use one engine. Keep the existing simulation controls if the query params support them (`mode`, `radiusMeters`, `topN`, `captureLowPct`, `captureHighPct`).

**Access:** Same roles that can open Competitor Overview.

## 28. Settings leftovers

**Branch:** `feature/web-settings-leftovers`

**Build:** Settings copy in `web/app/settings/settings-content.tsx` says chart layout and the cookie banner are coming soon. Finish those two controls. This branch has no new server module. If a control needs organisation settings, use the existing organisation settings endpoints.

**Access:** Same roles that can open Settings.

## 29. Intake WhatsApp

**Branch:** `feature/web-intake-whatsapp`

**Build:** `web/app/staff/components/send-intake-link-modal.tsx` shows WhatsApp as coming soon. Send the intake link on WhatsApp using the staff WhatsApp path the server already has (`server/src/lib/services/staff-whatsapp.ts`). Email send stays as it is.

**Access:** Same roles that can invite staff.

## 30. Call admin tools

**Branch:** `feature/web-call-admin`

**API:** `server/src/calls/calls.controller.ts`

`POST /calls/backfill`, `POST /calls/relink-leads`.

**Build:** Admin actions on `/calls`. Transcript retry, audio, and rating already exist.

**Access:** Admin only, same as call recordings.

---

## Pull request checklist

Use this on every branch:

- The branch contains one feature from this list.
- The page calls the server routes named on that feature.
- Empty, loading, and error states render.
- The sidebar and `canAccess` rules match the server roles.
- A standard user cannot open an admin-only route by typing the URL.
- Enterprise-only pages stay hidden when the org is not entitled.
