"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Magnetic } from "./primitives";
import styles from "../../app/home.module.css";

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
      <motion.div className={styles.waitSuccess} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <span className={styles.waitSuccessIcon}>✓</span>
        <div>
          <div style={{ fontWeight: 600 }}>You&rsquo;re on the list.</div>
          <div style={{ color: "var(--z-muted)", fontSize: 13.5, marginTop: 2 }}>We&rsquo;ll email <strong>{email}</strong> the moment Zeno hits the App Store.</div>
        </div>
      </motion.div>
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
        onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
        aria-label="Email address"
        aria-invalid={state === "error"}
      />
      <Magnetic strength={0.35}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={state === "loading"}>
          {state === "loading" ? "Joining…" : compact ? "Join waitlist" : "Join the waitlist"}
          {state !== "loading" ? <span aria-hidden>→</span> : null}
        </button>
      </Magnetic>
      {error ? <div className={styles.waitError} role="alert" style={{ flexBasis: "100%" }}>{error}</div> : null}
    </form>
  );
}
