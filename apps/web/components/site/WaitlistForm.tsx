"use client";

import { useState } from "react";
import styles from "../../app/home.module.css";
import { LedgerLine } from "./ledger";

/* Same contract as before — POST /api/waitlist {email}, four states, the
   route and its tests untouched. The success state is a printed receipt
   line, not a celebration: joining a waitlist is an entry, not a win.
   (The Stamp stays reserved for verified moments.) */
export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error("Request failed");
      setState("done");
    } catch {
      setError("Something went wrong. Try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className={`${styles.waitSuccess} zn-print`} role="status">
        <LedgerLine label="Waitlist" sub={email.toUpperCase()} value="ON THE LIST" valueColor="var(--stamp-verified)" />
        <p className={styles.waitSuccessSub}>We&rsquo;ll email you the moment Zeno reaches the App Store and Play Store. No other mail, no sharing your address.</p>
      </div>
    );
  }

  return (
    <form className={styles.waitForm} onSubmit={submit} noValidate>
      <input
        className={styles.waitInput}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        aria-label="Email address"
        aria-invalid={state === "error"}
        aria-describedby={error ? "waitlist-error" : undefined}
      />
      <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Joining…" : compact ? "Join waitlist" : "Join the waitlist"}
        {state !== "loading" ? <span aria-hidden>→</span> : null}
      </button>
      {error ? (
        <div id="waitlist-error" className={styles.waitError} role="alert">
          {error}
        </div>
      ) : null}
    </form>
  );
}
