// Security events (ASVS V16.2.1, V16.3.1 to V16.3.3; P7.2). Every sign-in, refresh,
// sign-out and sign-in email request, every successful change to a user's data
// (the audit trail, P8), and every refused request (400, 401, 403, 429), becomes
// one log line of its own, so an investigation can answer who
// (the account), what (the event and how: the sign-in method), where (the
// route), when (the line's UTC time) and with what result, without piecing it
// together from request lines.
//
// The account is the pseudonymous account id (`acct_...`), never an email
// address; bodies, tokens and query strings are never part of an event
// (docs/DATA_AND_LOGGING.md).

export type SecurityEvent = {
  event: string;
  outcome: "success" | "failure";
  route: string;
  status: number;
  method?: string;
  account?: string;
  household?: string;
};

// Routes that sign someone in, and the method each one is.
const SIGN_IN_METHODS: Record<string, string> = {
  "/api/v1/auth/verify": "email_link_or_code",
  "/api/v1/auth/magic-link/verify": "email_code",
  "/api/v1/auth/apple": "apple",
  "/api/v1/auth/google": "google",
  "/api/v1/auth/demo-login": "demo"
};

const AUTH_EVENTS: Record<string, string> = {
  "/api/v1/auth/refresh": "auth.refresh",
  "/api/v1/auth/logout": "auth.sign_out",
  "/api/v1/auth/magic-link": "auth.email_requested",
  "/api/v1/auth/magic-link/request": "auth.email_requested"
};

// What a refusal means, whatever the route.
const REFUSALS: Record<number, string> = {
  400: "input.refused",
  401: "access.unauthenticated",
  403: "access.forbidden",
  429: "rate_limited"
};

// Successful changes to a user's data (the audit trail, R31), by method and
// route. A refused change is already a refusal event.
const DATA_CHANGES: Record<string, string> = {
  "DELETE /api/v1/account": "data.account_deleted",
  "POST /api/v1/family/create": "data.household_created",
  "POST /api/v1/family/join": "data.household_joined",
  "POST /api/v1/family/:householdId/spend": "data.household_spend_changed",
  "POST /api/v1/family/:householdId/leave": "data.household_left",
  "POST /api/v1/plaid/exchange": "data.bank_connected",
  "POST /api/v1/sync/push": "data.synced"
};

/** The security event a finished request makes, or null when it makes none. */
export function securityEvent(
  route: string,
  status: number,
  account: string | undefined,
  request: { httpMethod?: string; householdId?: string } = {}
): SecurityEvent | null {
  const outcome = status < 400 ? "success" : "failure";
  const base = { outcome, route, status, ...(account ? { account } : {}) } as const;
  const method = SIGN_IN_METHODS[route];
  if (method) return { event: "auth.sign_in", method, ...base };
  const authEvent = AUTH_EVENTS[route];
  if (authEvent) return { event: authEvent, ...base };
  const change = DATA_CHANGES[`${request.httpMethod ?? "GET"} ${route}`];
  if (change && status < 400) return { event: change, ...base, ...(request.householdId ? { household: request.householdId } : {}) };
  const refusal = REFUSALS[status];
  return refusal ? { event: refusal, ...base } : null;
}
