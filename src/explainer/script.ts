/**
 * The explainer's subtitle track. Times are absolute seconds; scenes in `timeline.ts` are laid
 * out on the same clock, so edit both together.
 */

export interface Cue {
  start: number;
  end: number;
  text: string;
}

export const CUES: Cue[] = [
  // 1 · The question
  { start: 0.6, end: 4.6, text: "Every organization runs on one quiet question…" },
  { start: 4.8, end: 8.4, text: "…who is allowed to do what?" },
  { start: 8.8, end: 15.6, text: "This is a sandbox for learning how that question gets answered — by doing it yourself." },

  // 2 · Keys everywhere
  { start: 16.5, end: 21.0, text: "Meet Meridian Health Ops: a hospital back office with patients, claims, invoices and more." },
  { start: 21.2, end: 25.4, text: "Hand out access one person at a time, and it works… for a while." },
  { start: 25.6, end: 30.2, text: "Then people join, move and leave. The keys pile up, and nobody remembers why." },
  { start: 30.4, end: 35.6, text: "Role-based access control — RBAC — is the tidy fix. It has three layers." },

  // 3 · Permissions
  { start: 36.5, end: 41.0, text: "Layer one: permissions. Each one is a resource plus an action." },
  { start: 41.2, end: 46.0, text: "patients:read. invoices:approve. Small, specific, and boring — on purpose." },
  { start: 46.2, end: 53.6, text: "A few are sensitive — deleting records, exporting data, changing settings — and the sandbox flags them in red." },

  // 4 · Roles
  { start: 54.5, end: 59.0, text: "Layer two: roles. A role is a named bundle of permissions." },
  { start: 59.2, end: 64.0, text: "Clinical Nurse = read patients, update patients, read claims. Defined once, reused everywhere." },
  { start: 64.2, end: 69.6, text: "Edit a role, and everyone who holds it changes with it. That's the power — and the risk." },

  // 5 · Groups
  { start: 70.5, end: 75.0, text: "Layer three: groups. Groups carry roles, and people join groups." },
  { start: 75.2, end: 80.0, text: "Dana is a new nurse. Drop her into Clinical Staff and she gets exactly what nurses get." },
  { start: 80.2, end: 85.4, text: "Groups can sit inside other groups. Physicians is nested inside Clinical Staff…" },
  { start: 85.6, end: 91.6, text: "…so Raj inherits both. The sandbox shows every path a permission travels to reach someone." },

  // 6 · Drift
  { start: 92.5, end: 97.0, text: "Real directories drift. Small shortcuts turn into big holes." },
  { start: 97.2, end: 103.0, text: "Someone nested Interns inside Platform Admins. Ben, the summer intern, can now delete user accounts." },
  { start: 103.2, end: 109.0, text: "Marcus left on Friday — but his account still works, with an admin role pinned straight onto it." },
  { start: 109.2, end: 117.4, text: "And Aisha can both create and approve invoices: a segregation-of-duties conflict." },

  // 7 · The sandbox
  { start: 118.5, end: 123.0, text: "So here's the sandbox: you're the new admin of Meridian's identity console." },
  { start: 123.2, end: 128.4, text: "On the left, a queue of thirteen access reviews — each one a real defect planted in the directory." },
  { start: 128.6, end: 134.0, text: "Make a change in Users, Groups or Roles, and every review is re-graded instantly." },
  { start: 134.2, end: 140.0, text: "Add Dana to Clinical Staff… and watch the acceptance criteria tick off, one by one." },
  { start: 140.2, end: 149.6, text: "Then impersonate anyone and press their buttons: 200 ALLOWED with the exact grant path, or 403 DENIED." },

  // 8 · No shortcuts
  { start: 150.5, end: 155.4, text: "Shortcuts don't count. Deleting Marcus fails — HR needs the account kept for the audit." },
  { start: 155.6, end: 160.4, text: "Gutting a shared role or dissolving a group fails too. The criteria watch for it." },
  { start: 160.6, end: 165.6, text: "But many reviews accept more than one honest fix. Think like an auditor, not a janitor." },

  // 9 · Thirteen reviews
  { start: 166.5, end: 171.6, text: "Onboarding, offboarding, least privilege, service accounts, break-glass access…" },
  { start: 171.8, end: 179.4, text: "Thirteen reviews, from starter to advanced — and some of them chain together." },

  // 10 · Your turn
  { start: 180.5, end: 185.2, text: "Nothing is saved. Break whatever you like — Reset tenant puts it all back." },
  { start: 185.4, end: 190.2, text: "Your first review is already waiting: onboard Dana, the new nurse." },
  { start: 190.4, end: 196.0, text: "Close this video and give it a go." },
];
