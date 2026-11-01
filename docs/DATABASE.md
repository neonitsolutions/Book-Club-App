# Database (MongoDB)

Mongoose schemas live next to the module that owns them (`apps/backend/src/<module>/*.schema.ts`).
`src/database/models.ts` lists every collection.

## Collections

| Module        | Collection (model)                   | What it holds                                                                 |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| users         | `users` (User)                       | Accounts and roles (ADMIN, STAFF, MEMBER)                                     |
| auth          | `sessions` (Session)                 | One per signed-in device; refresh-token hashes; TTL-deleted                   |
| books         | `books` (Book)                       | Titles, not physical books. Media keys, prices, catalog availability counts   |
| books         | `authors`, `categories`              | Referenced by books                                                           |
| inventory     | `bookcopies` (BookCopy)              | One per physical book: inventory code, QR token, status, condition, location  |
| subscriptions | `subscriptionplans` (SubscriptionPlan) | Plans the admin creates: price, days, books at a time, loan length, late fee |
| subscriptions | `memberships` (Membership)           | A member's subscription, with the plan terms frozen at purchase               |
| payments      | `payments`, `paymentevents`          | Payment attempts (any gateway) and every webhook received                     |
| rentals       | `rentals` (Rental)                   | One per copy lent: reserved, checked out, due, returned, late fee             |
| orders        | `orders`, `carts`                    | Purchases (one line per copy) and rental/purchase carts                       |
| scans         | `scanevents` (ScanEvent)             | Every QR scan, accepted or rejected                                           |
| notifications | `notifications`                      | In-app, email and SMS messages; deleted after 180 days                        |
| audit         | `auditlogs` (AuditLog)               | Who changed what; append-only                                                 |
| database      | `counters` (Counter)                 | Sequences for inventory codes and order numbers                               |

## Rules the data layer guarantees

MongoDB enforces these with unique and partial indexes, so they hold even if application code has a bug or two
requests race:

- A copy is in at most one open rental (`one_open_rental_per_copy`).
- A member has at most one live (ACTIVE/EXPIRING) membership (`one_live_membership_per_user`).
- Inventory codes, QR tokens, ISBNs, slugs, payment references and webhook event ids are unique.
- `MembershipsService.claimRentalSlot` never lets a member go past the plan's book limit.
- `InventoryService.reserveAvailableCopy` gives a free copy to exactly one request.

## Rules new code must follow

- **Money is integer kobo** (`₦1 = 100 kobo`), in fields ending `Kobo`. Use `nairaToKobo()` at the edges.
- **Change copy status only through `InventoryService`**, inside a transaction (`inTransaction`), so
  `book.availability`, which the catalog shows, stays correct.
- **Multi-step operations run in one transaction.** For example, reserve copy + create rental + claim slot:
  either all happen or none do. Pass the `session` to every call. No emails or gateway calls inside the
  transaction, because it may be retried.
- **Never put files in MongoDB.** Images and videos go to object storage; store the key (`MediaAsset`).
- **Archive books, don't delete them.** Rentals, orders and copies point at them.
- **Snapshot what can change later.** Orders copy title and price; memberships copy plan terms.

## Local setup

`docker compose up -d mongodb` runs MongoDB 7 as a single-node replica set, which transactions require
(Atlas is always one). Connect with `?directConnection=true`, as in `apps/backend/.env.example`.

```bash
cd apps/backend
npm run db:indexes -- --dry-run     # show index changes
npm run db:indexes                  # apply them (also run after deploying schema changes)
npm run db:seed                     # categories, plans, admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
npm run db:seed -- --sample         # ...plus 5 sample books with copies
```

In the container: `node dist/database/scripts/seed.js` and `node dist/database/scripts/sync-indexes.js`.

## Tests

`test/data-layer.e2e-spec.ts` runs against an in-memory replica set and checks the guarantees above,
including the races.
