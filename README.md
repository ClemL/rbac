# RBAC Sandbox — Meridian Health Ops

A single-page simulator for learning role-based access control by administering it. You are handed
the identity console of a fictional healthcare operations system and a queue of seven access
reviews. Every change you make is re-graded immediately against the acceptance criteria for each
review, so the feedback loop is one action long.

Nothing is persisted. Reloading the page, or pressing **Reset tenant**, restores the seed directory.

## The access model

Access is resolved exactly the way a real directory resolves it, and the app shows its work.

```
User ──directly assigned──────────────────────────────────► Role ──► Permission
  └──member of──► Group ──member of──► Group ──assigned──► Role ──► Permission
```

- **Permissions** are `resource:action` pairs across six modules (patients, claims, invoices,
  reports, users, settings). Some are marked sensitive and drive the risk indicators.
- **Roles** are named bundles of permissions. Editing a role changes access for everyone it reaches.
- **Groups** carry roles and hold members. Groups can be members of other groups, so roles flow
  downward through nesting — the mechanism behind most accidental privilege escalation.
- **Users** get access from their groups (the intended path) and from roles pinned directly to the
  account (the exception path the reviews push you away from).
- A **suspended** account resolves to zero effective permissions while the directory still grants
  them on paper. The user detail view shows both, because the difference is what makes an
  incomplete offboarding dangerous.

Cycles in group nesting are rejected at the UI layer rather than silently producing infinite
recursion.

## The reviews

Thirteen reviews, each planted as a real defect in the seeded tenant.

| # | Review | Theme |
|---|--------|-------|
| 1 | Onboard the new nurse | Provisioning through groups, not direct assignment |
| 2 | Offboard a departed employee | Retention vs. revocation; suspension is not enough |
| 3 | Trim an over-permissioned role | Least privilege at the role layer |
| 4 | Resolve a segregation-of-duties conflict | Conflicting permissions on one identity |
| 5 | Scope an external contractor | Building purpose-fit roles and groups |
| 6 | Move a transfer without privilege creep | The mover problem: joiner and leaver at once |
| 7 | Defuse an over-broad group | An entitlement attached to "everyone" |
| 8 | Scope a service account | Non-human identity and shared credentials |
| 9 | Close a nested-group escalation | Fixing structure instead of symptoms |
| 10 | Contain a sensitive export permission | Data governance and blast radius |
| 11 | Grant a shared entitlement once | Nesting instead of duplicating a permission |
| 12 | Stand up a break-glass account | Granted on paper vs. effective in practice |
| 13 | Retire what nothing uses | Recertification; orphan roles and dead groups |

Each review carries acceptance criteria that also guard against the shortcut solutions — deleting
the account, gutting a shared role, dissolving a group, or hiding a structural problem by moving
one person out of the way. Several reviews accept more than one legitimate fix, and a few chain:
transferring Raj in review 6 is what leaves objects for review 13 to certify.

## Tabs

- **Users** — memberships, direct role assignments, status, and the full derivation of every
  effective permission (`Physicians → Clinical Staff → Clinical Nurse`).

Selection is held in the store rather than in the tabs, so the focused user, group and role survive
tab switches, and a newly created object is selected and scrolled into view automatically.
- **Groups** — role grants, nesting in both directions, direct vs. inherited members, and the union
  of permissions the group confers.
- **Roles** — a permission matrix by resource, plus how far the role reaches.
- **Impersonate** — open the managed system as any account. Records are redacted without read
  access, and every action button returns `200 ALLOWED` with its grant path or `403 DENIED`.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # grading-engine tests (node:test via tsx)
npm run check    # types, lint, tests
```

## Deploying to Vercel

The app is a static, client-only Next.js App Router page — no server routes, no database, no
environment variables.

```bash
npx vercel        # preview
npx vercel --prod # production
```

Or import the repository at vercel.com; the framework preset, build command (`next build`) and
output are detected automatically.

## Layout

```
src/lib/types.ts        Directory model
src/lib/permissions.ts  Permission catalog and SoD conflict pairs
src/lib/seed.ts         The seeded tenant, planted with each review's defect
src/lib/rbac.ts         Resolution engine: closures, grants, derivation paths
src/lib/tasks.ts        Review definitions and the grader
src/lib/store.tsx       Reducer; re-grades every review after each mutation
src/components/         Console shell, four tabs, review panel, activity log
tests/missions.test.ts  Proves each review is solvable, that all thirteen can
                        hold at once, and that the shortcut solutions fail
```
