import { encryptionKeyStatus, pgEnabled } from "./storage/pg";

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

  if (isProd()) {
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
