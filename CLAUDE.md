# RCAL Station app: working rules

Native app (Expo / React Native) for the SolarEPC Station CRM. Read this file first, every session.

> ## THE 4 RULES
>
> ### 1. DO NOT DEVIATE FROM THE DESIGN
> The design is `docs/Solar_EPC_App_Wireframes.pdf`. Layout, tabs, card content, button placement, colours and wording follow it. If something seems wrong or missing in the design, **stop and ask**. Do not improvise a different layout.
>
> ### 2. IF A PART ISN'T BUILT, SHOW "UNDER DEVELOPMENT"
> Never show an empty tab, a dead button, fake data, or text like "Coming soon". Every unbuilt screen, tab, card or button shows the words **Under development**, so nobody mistakes it for a bug. Remove the label only when the real feature works.
>
> ### 3. PLAN BEFORE BUILD
> Before writing code for a phase: list the screens, the buttons, who sees each one (role), which API calls and backend rules apply, and what could fail. Give the plan to Mohammed and **wait for his OK**. Anything that changes live data is never built before the plan is approved.
>
> ### 4. COMPARE WITH THE WIREFRAMES BEFORE FINISHING, AND REPEAT UNTIL IT MATCHES
> Before a build is called finished:
> 1. Open the screens and put them next to the matching wireframe page.
> 2. Write down every difference (layout, order, labels, spacing, colours, missing items).
> 3. Check the code for errors: `npm run typecheck`, `npm test`, the browser tests, and `node --check` on any backend file.
> 4. Fix the differences and the errors.
> 5. **Repeat from step 1 until the design matches and the code is clean.** Only then deliver, with screenshots next to the wireframes.
>
> Never say "done" with a known difference. If a difference is intentional, say so and get approval.

---

## Where the design is

`docs/Solar_EPC_App_Wireframes.pdf` (6 pages)

| Page | What it shows |
|---|---|
| 1 | App navigation, where each web page goes in the app, 6 placement rules |
| 2 | iOS: Sign in, Home (dark hero card, quick actions, action queue), Customers (cards with progress bar and "Next:" line) |
| 3 | iOS: Customer Overview, Update Progress (dark current-step card, sticky bottom buttons), Cash Flow (gauge, next 3 money steps) |
| 4 | iOS: Documents (progress ring, Scan), New customer (3 steps), Tasks (work queues) |
| 5 | Android: Home, Customers, Customer Overview (extended FAB, M3 tabs, WhatsApp + next action bar) |
| 6 | Android: Update progress, Cash flow, Loan tracker (SLA-sorted cards) |

### Placement rules from the design (page 1)
1. Next action is a **sticky bottom button** on every customer screen.
2. The pipeline is a **compact stepper** (dots plus the current step name), not 8 labels.
3. **One dark hero card per screen** holding the number that matters.
4. **Call, WhatsApp and Map** sit in the customer header.
5. SLA breaches and pending items use the warm alert tone and sit above everything else.
6. Tables become **cards** (name, ID, kW, city, stage chip, progress bar, next action, agent).

### Navigation
- Tabs: **Home, Customers, +, Tasks, More** (centre "+" opens New customer / Upload document / Record payment / Site photo).
- Installers: **Tasks first**, no Customers, no "+". Agents get My Leads.
- Customer screen has **5 tabs: Overview, Progress, Cash, Docs, Logs**. Notes live in Overview. Loan, Installation and Subsidy are cards inside Progress. Edit, Assign agent and Cancel are in the "..." menu.
- Colours: brand green `#166534`, dark green hero, pastel status cards, one warm alert tone. Grey means "cancelled" only.

---

## Project facts (do not re-ask)

- Stack: Expo SDK 58, React Native, TypeScript strict, expo-router. Source in `src/`.
- API: Cloudflare Worker `solarepc-api.ramakrishnam28.workers.dev/api/v1`, Node/Express + PostgreSQL on Railway. Backend repo: `solarepc-backend`.
- Users: whole team, all roles. Android first (private APK), iOS later. Online only.
- Auth: access token 15 min, refresh token 7 days and it rotates (refresh must be single-flight). Tokens in SecureStore. Biometric lock after 2 minutes in the background.
- Permissions: individual override > role permissions from the server > defaults. The server is always the final judge; the app only hides what a role can never use.
- Status rules live in the backend (`utils/statusEngine.js`, `utils/workflow.js`). `src/lib/rules.ts` copies them and a test compares them. After a backend change run `node scripts/make-backend-rules.js "<path to backend src>"` then `npm test`.
- Server data is fake test data. Never enter or print passwords or tokens.

## Working agreements

- Short, direct answers. Copy-paste git commands after every change.
- Audit and discuss before complex features.
- Prefer permanent code fixes over manual database patches.
- Run `node --check` on every backend file delivered.
- The uploaded file is the new base. Never patch a stale copy.
- Check commands before delivery: `npm run typecheck`, `npm test`, browser tests.

## Build status

| Part | Status |
|---|---|
| Sign in, session, biometric lock, offline screen | Built. Login hero + "Forgot password" (tells you to ask an admin, no reset endpoint) |
| Home | Built to the Android design (hero, pipeline labels, quick actions, tiles, Needs attention). iOS greeting/pill bar with `EXPO_PUBLIC_DESIGN=ios` |
| Customers list | Built to the design. Sorted "newest first" (server cannot sort by next action) |
| Customer screen | Built: 5 tabs, step dots, Call/WhatsApp/Map, ⋮ menu, sticky bottom bar |
| Actions: next step, Move back, Cancel, Reactivate, completion, notes | Built, working |
| New customer (3 steps, duplicate phone check), Edit customer | Built |
| Field visit "Mark done" | Built. **Needs backend patch 2** (validator stripped the fields; also broken on the web) |
| Docs: 8 KYC documents (camera / gallery / PDF), view, replace | Built. Manager needs backend patch 2 |
| Site photos (8 labels + net meter), GPS check-in | Built (photos themselves carry no GPS; the check-in does) |
| Cash flow: quotation split, tiles, money steps, Record payment (cash / hybrid) | Built. Loan disbursal recording and "Share statement" stay **Under development** |
| Tasks: installer jobs, team queue grouped by next action | Built |
| More: Loan tracker (SLA sort, bank/status chips, Call bank, Escalate), Net meter, Subsidy, Disbursements trackers | Built |
| Assign agent, Notifications, Reports, "+" action sheet | **Under development** |