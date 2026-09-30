import { encryptionKeyStatus, pgEnabled, pgSslMode } from "./storage/pg";

// Boot-time configuration validation. Called once from server.ts BEFORE listen()
// so misconfiguration surfaces as a single loud summary (or a hard exit for fatal
// cases) at startup, instead of a confusing lazy failure on the first request
// that happens to touch it. Deliberately a plain function reading process.env
// live — never a frozen module singleton — so it doesn't fight the env-toggling
// that tests (and this validator's own tests) rely on.

export type ConfigReport = {
  fatal: string[]; // must-fix before serving; process exits
  warnings: string[]; // degraded-but-serves
};

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

export function validateConfig(): ConfigReport {
  const fatal: string[] = [];
  const warnings: string[] = [];

  // A malformed encryption key is always a mistake (someone set it to the wrong
  // length/encoding). Token encryption silently disables, so bank tokens would
  // fall back to in-memory and vanish on restart. Warn everywhere; fatal in prod.
  const keyStatus = encryptionKeyStatus();
  if (keyStatus === "malformed") {
    const message =
      "STORAGE_ENCRYPTION_KEY is set but malformed (need 32 bytes as 64 hex chars or base64) — token encryption is DISABLED.";
    if (isProd()) fatal.push(message);
    else warnings.push(message);
  }

  // A typo'd DATABASE_SSL must never silently change how the database is
  // reached. pg.ts already resolves an unknown value to the strictest mode
  // ("verify"); say so loudly, and refuse to boot production on it.
  const ssl = pgSslMode();
  if (!ssl.valid) {
    const shown = JSON.stringify(String(process.env.DATABASE_SSL).slice(0, 40));
    const message = `DATABASE_SSL=${shown} is not one of require | verify | disable — using "verify" (the strictest).`;
    if (isProd()) fatal.push(message);
    else warnings.push(message);
  }

  if (isProd()) {
    if (pgEnabled() && ssl.mode === "disable") {
      warnings.push("DATABASE_SSL=disable in production — database traffic is NOT encrypted.");
    }
    // JWT signing keys are required in production (auth.ts throws lazily without
    // them; check at boot so a misconfigured deploy dies immediately, not on the
    // first login). Ephemeral keys would log everyone out on each restart.
    if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
      fatal.push("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production (auth tokens would not survive a restart).");
    }
    // Degraded-but-serves: surface the silent-data-loss modes as warnings.
    if (!pgEnabled()) {
      warnings.push("DATABASE_URL is not set — running in-memory only; all persisted data is lost on restart/redeploy.");
    }
    if (keyStatus === "unset") {
      warnings.push("STORAGE_ENCRYPTION_KEY is not set — bank (Plaid) tokens cannot be persisted and stay in-memory only.");
    }
    if (!process.env.RESEND_API_KEY) {
      warnings.push("RESEND_API_KEY is not set — magic-link email delivery will fail (Apple/Google sign-in still work).");
    }
    if (!process.env.CORS_ALLOWED_ORIGINS) {
      warnings.push("CORS_ALLOWED_ORIGINS is not set — browsers from other origins will be blocked (mobile/native are unaffected).");
    }

    // P2.6. The magic link carries a one-time login token, so it must never
    // travel over cleartext: an http:// redirect is fatal. (render.yaml sets
    // the custom scheme zeno://auth/verify.)
    const redirect = process.env.MAGIC_LINK_REDIRECT_URL?.trim();
    if (redirect && /^http:\/\//i.test(redirect)) {
      fatal.push("MAGIC_LINK_REDIRECT_URL uses http:// in production — magic-link login tokens would travel in cleartext.");
    }
    // Already impossible at request time in production (fail-closed, tested):
    // demo login is off and the unverified-OAuth flag is ignored. Flagged at
    // boot so a stray value is removed, but as a WARNING: main auto-deploys, and
    // a new boot refusal on a dashboard value nobody can see from the repo
    // would take the API down for no security gain.
    if (process.env.DEMO_LOGIN_PASSWORD) {
      warnings.push("DEMO_LOGIN_PASSWORD is set in production — demo login stays disabled here; remove the variable.");
    }
    if (process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS === "true") {
      warnings.push("ALLOW_UNVERIFIED_OAUTH_TOKENS=true in production — it is ignored (tokens are always verified); remove the variable.");
    }
    const origins = (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
    if (origins.includes("*")) {
      warnings.push("CORS_ALLOWED_ORIGINS contains \"*\" — the API matches exact origins only, so it allows nothing; list real origins.");
    }
    for (const origin of origins.filter((o) => /^http:\/\//i.test(o))) {
      warnings.push(`CORS_ALLOWED_ORIGINS allows a cleartext origin (${origin.slice(0, 60)}) in production.`);
    }
    if (/^http:\/\//i.test(process.env.MONITORING_WEBHOOK_URL?.trim() ?? "")) {
      warnings.push("MONITORING_WEBHOOK_URL uses http:// — error alerts would travel in cleartext.");
    }
    // P2.7: the coach sends GROQ_API_KEY as a bearer token to this URL.
    if (/^http:\/\//i.test(process.env.COACH_BASE_URL?.trim() ?? "")) {
      warnings.push("COACH_BASE_URL uses http:// — the AI provider's API key would travel in cleartext.");
    }
  }

  return { fatal, warnings };
}

// Log the report and exit(1) on any fatal item, so a misconfigured production
// deploy fails fast and visibly rather than serving in a silently broken state.
export function assertConfigOrExit(): void {
  const { fatal, warnings } = validateConfig();
  for (const warning of warnings) console.warn(`[zeno][config] WARN: ${warning}`);
  if (fatal.length > 0) {
    for (const item of fatal) console.error(`[zeno][config] FATAL: ${item}`);
    console.error("[zeno][config] refusing to start with fatal configuration errors.");
    process.exit(1);
  }
}
