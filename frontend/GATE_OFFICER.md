# Gate Officer screens

Run `npm install` if dependencies are missing, then `npm run dev` from
`frontend/`. In Windows PowerShell use `npm.cmd` if script execution is disabled.

## Open the five design states

These explicit previews need no login or backend and never upload fixture scans.

| Screen | Local URL | Figma node |
| --- | --- | --- |
| Vehicle Released | http://localhost:5173/#/gate/released?preview=design | 33:615 |
| Pass Rejected | http://localhost:5173/#/gate/rejected?preview=design | 33:750 |
| Offline Sync Queue | http://localhost:5173/#/gate/sync?preview=offline | 2:1243 |
| All Scans Synced | http://localhost:5173/#/gate/sync?preview=synced | 87:1793 |
| Shipments | http://localhost:5173/#/gate/shipments?preview=design | 2:1431 |

Both sync states use `components/gate/SyncQueue.jsx`. The preview home at
`/#/gate/home?preview=design` also links to the states. Preview navigation retains
the preview flag; the scanner is the existing QR scanner with submissions disabled.
Retrying the offline fixture displays feedback and preserves all three rows.

The reference is [TrendyPass Gate Officer Mobile UI](https://www.figma.com/design/hp9wEQYSz0C2ZKcFjqeFVT/TrendyPass?node-id=0-1).
Use a 390 × 844 viewport for comparison and 320 × 568 for the smaller-phone check.
Content scrolls independently above the bottom actions/navigation. The simulated
phone status bar and home indicator appear only in design previews; live routes
use safe-area insets and the actual device's system UI.

## Live integration

Start the existing backend using the root README, sign in as `security`, and open
Gate Home. Existing portal roles with scanner access also have a Gate Home tab.
Live routes omit `?preview=…`:

- `/#/gate/home` is the minimal navigation entry point.
- `/#/gate/scan` embeds the existing `ScannerModule` and its QR camera/manual input.
- A successful departure opens `/#/gate/released` using the returned consignment.
- A server-verified pass with an existing departure timestamp opens
  `/#/gate/rejected` when an officer attempts another departure. The signature
  remains VALID while the pass status is ALREADY EXITED. Failed verification
  stays in the scanner; it is never represented as a valid signature.
- `/#/gate/sync` reads the existing persistent offline queue and upload receipts.
  Browser reconnection triggers `/api/scanner/sync`. All entry points share an
  in-flight request, and Web Locks serialize uploads across supported browser
  tabs. Only explicitly acknowledged IDs are removed. Failed, missing, and newly
  queued scans remain stored. Retried uploads keep the original `clientScanId`,
  which the existing backend deduplicates.
- `/#/gate/shipments` reads `/api/transfers`, with the existing cache as a fallback,
  and filters today's transfers in Asia/Colombo time. Search matches transfer ID,
  either route endpoint, branch names, or vehicle plate, ignoring case and punctuation.
- Home and scan actions use the shared gate navigation. Alerts reuses the existing
  discrepancy module; Profile exposes the existing session and sign-out action.

Live result URLs require a scan result in the current session. Reloading them
prompts the officer to scan again instead of showing a sample release/rejection.

## Samples and remaining integration fields

All Figma fixtures are in `src/data/gateSamples.js`, separate from components.
The 23-transfer summary, four displayed shipment examples, three waiting scans,
one synced row, 23-upload summary, and fixed times are design samples only.
Live counters use actual transfers and receipts recorded by this browser.

`src/api/gateData.js` adapts existing API records. The current backend does not
provide bundle count, gate name, the vehicle plate actually observed at a rejected
scan, receiving-gate notification confirmation, or supervisor-alert confirmation.
The previews reproduce those Figma fields. Live screens omit unavailable bundle
counts, use the source branch for the gate, show “Not recorded” for an unobserved
plate, and do not claim that a notification was delivered. Teammates can connect
`bundleCount`, `gateName`, `observedVehiclePlate`, and `receivingGateNotified` through
this adapter. The existing departure API does not itself reject all duplicate
departure attempts; the new scanner-to-result wiring detects an already-exited,
verified pass before sending another departure request.

The requested demo supervisor number is **+94 77 000 0000**. `Call Supervisor` uses
a `tel:` link. Set `VITE_GATE_SUPERVISOR_PHONE` in `frontend/.env.local` (see
`.env.example`) and restart Vite to override it. A future `user.supervisorPhone`
field takes precedence. The demo number is a placeholder, not an operational contact.

Fonts and SVG assets are served locally from `public/fonts` and `public/gate-assets`.
Font licenses are included. The scoped `gate.css` tokens follow the Figma palette
without changing the management portal's theme. No UI/framework dependency was added.

## Verification

- `npm test`: 13 passing tests for search, real-data mapping, phone configuration,
  offline retries, concurrent retries, partial acknowledgements, lost responses,
  scans enqueued during upload, and cross-tab lock behavior.
- `npm run test:api`: passes against a fresh temporary SQLite database, exercising
  the real backend plus frontend sync service. It checks partial failures and
  confirms that retrying an accepted ID creates only one audit record. It never
  seeds or modifies the project database.
- `npm run build`: passes. Vite reports a large shared bundle warning.
- All five routes pass a React server-render smoke check. Every referenced SVG
  is present locally and its markup dimensions match the original asset. This
  checks rendering and asset wiring, not browser layout or effective geometry.
- The existing `backend/verify-e2e.js` was also run against a temporary seeded DB.
  It fails during transfer creation: it picks the first vehicle, which is already
  in transit, then reads `consignment.status` from the rejected departure response.
  This unrelated legacy script and backend behavior were left unchanged.
- Browser visual comparison and pointer/keyboard checks at **390 × 844** and
  **320 × 568** remain unverified: the in-app browser host was unavailable, then
  Windows browser automation stopped because it could not verify Chrome's URL.
  The production build and non-browser checks do not replace that visual review.

For the remaining browser pass, open each preview above, compare the same Figma
node, scroll the details on the smaller viewport, and confirm the footer remains
reachable. Check every Scan/Home action, the Shipments search toggle (ID, route,
plate, and no-match), the supervisor link's destination, and repeated offline retry.
