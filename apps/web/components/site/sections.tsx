"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CountUp, Magnetic, Reveal, StaggerGroup, staggerChild } from "./primitives";
import { FAQS } from "./faq-data";
import { WaitlistForm } from "./WaitlistForm";
import styles from "../../app/home.module.css";

// ── Features ──────────────────────────────────────────────────────────────
export function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.sectionGlow} style={{ width: 500, height: 500, top: 100, left: -150, background: "rgba(91,140,255,0.18)" }} />
      <div className={styles.container}>
        <Reveal>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Why Zeno</span>
          <h2 className={styles.h2}>Most subscriptions don&rsquo;t get cancelled<br /><span className={styles.gradText}>because you forget they exist.</span></h2>
          <p className={styles.lead}>Zeno is built around one idea: stop the charge <em>before</em> it leaves your account. Four things make that happen.</p>
        </Reveal>

        <div style={{ marginTop: 80 }}>
          {/* Discovery */}
          <div className={styles.featureRow}>
            <Reveal>
              <span className={styles.featureKicker} style={{ color: "var(--z-blue)" }}>01 — Discover</span>
              <h3 className={styles.featureTitle}>Finds every subscription, automatically.</h3>
              <p className={styles.featureBody}>Connect Gmail or drop in a bank statement and Zeno surfaces every recurring charge — even the annual ones you forgot and the App Store bundles you can&rsquo;t see. Multiple inboxes, merged into one clean list.</p>
              <ul className={styles.featureList}>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Email + bank-statement discovery, scanned on your device</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>600-service catalog with auto-filled prices &amp; cycles</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Catches annual plans and free trials before they bill</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className={styles.featureVisual}>
              <MockDiscovery />
            </Reveal>
          </div>

          {/* Renewal radar */}
          <div className={`${styles.featureRow} ${styles.featureRowReverse}`}>
            <Reveal>
              <span className={styles.featureKicker} style={{ color: "var(--z-emerald)" }}>02 — Warn</span>
              <h3 className={styles.featureTitle}>A renewal radar that pings you in time.</h3>
              <p className={styles.featureBody}>Seven days out, three days out, and the morning of — Zeno warns you while you can still act, with quiet hours respected and the exact amount about to be charged.</p>
              <ul className={styles.featureList}>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>7-day, 3-day and day-of reminders, per subscription</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Calendar view of everything renewing this week</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Notifications you can tune — no spam</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className={styles.featureVisual}>
              <MockRadar />
            </Reveal>
          </div>

          {/* One-tap cancel */}
          <div className={styles.featureRow}>
            <Reveal>
              <span className={styles.featureKicker} style={{ color: "var(--z-rose)" }}>03 — Cancel</span>
              <h3 className={styles.featureTitle}>One tap to the exact cancel flow.</h3>
              <p className={styles.featureBody}>When a reminder fires, the cancel button takes you straight to that service&rsquo;s real cancellation steps — including the dark-pattern traps to dodge. No hunting through settings.</p>
              <ul className={styles.featureList}>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Service-specific, step-by-step cancellation guides</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Difficulty ratings &amp; dark-pattern warnings</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Direct deep-links to the cancel page</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className={styles.featureVisual}>
              <MockCancel />
            </Reveal>
          </div>

          {/* Privacy */}
          <div className={`${styles.featureRow} ${styles.featureRowReverse}`}>
            <Reveal>
              <span className={styles.featureKicker} style={{ color: "var(--z-cyan)" }}>04 — Private</span>
              <h3 className={styles.featureTitle}>No bank login. Ever.</h3>
              <p className={styles.featureBody}>Most subscription apps demand read access to your bank account. Zeno doesn&rsquo;t. Your data is encrypted on your device — discovery happens locally, and you stay in control.</p>
              <ul className={styles.featureList}>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>On-device encrypted storage (SQLCipher)</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>Biometric app lock</li>
                <li className={styles.featureLi}><span className={styles.featureLiDot}>✓</span>No financial credentials, no data brokers</li>
              </ul>
            </Reveal>
            <Reveal delay={0.1} className={styles.featureVisual}>
              <MockPrivacy />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockDiscovery() {
  const rows = [
    { n: "Netflix", c: "#E50914", a: "$15.49", b: "monthly", t: "rgba(229,9,20,0.16)" },
    { n: "ChatGPT Plus", c: "#10A37F", a: "$20.00", b: "monthly", t: "rgba(16,163,127,0.16)" },
    { n: "Adobe CC", c: "#FF3B30", a: "$54.99", b: "monthly", t: "rgba(255,59,48,0.16)" },
    { n: "Spotify", c: "#1DB954", a: "$10.99", b: "monthly", t: "rgba(29,185,84,0.16)" }
  ];
  return (
    <div className={styles.visual}>
      <div className={styles.mockHead}>
        <div className={styles.mockDots}><span className={styles.mockDot} style={{ background: "#fb7185" }} /><span className={styles.mockDot} style={{ background: "#fbbf24" }} /><span className={styles.mockDot} style={{ background: "#34d399" }} /></div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--z-quiet)" }}>4 found · 1 inbox</span>
      </div>
      {rows.map((r, i) => (
        <motion.div key={r.n} className={styles.mockRow} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
          <span className={styles.mockAvatar} style={{ background: r.t, color: r.c }}>{r.n[0]}</span>
          <div><div className={styles.mockName}>{r.n}</div><div className={styles.mockMeta}>{r.b}</div></div>
          <span className={styles.mockAmt}>{r.a}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MockRadar() {
  const items = [
    { n: "Netflix", d: "in 1 day", c: "var(--z-rose)", bg: "rgba(251,113,133,0.14)" },
    { n: "Adobe CC", d: "in 2 days", c: "var(--z-rose)", bg: "rgba(251,113,133,0.14)" },
    { n: "Midjourney", d: "in 5 days", c: "var(--z-amber)", bg: "rgba(251,191,36,0.14)" }
  ];
  return (
    <div className={styles.visual}>
      <div className={styles.mockHead}>
        <span className={styles.mockName}>This week</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--z-emerald)" }}>$80.48 due</span>
      </div>
      {items.map((r, i) => (
        <motion.div key={r.n} className={styles.mockRow} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }}>
          <span className={styles.mockAvatar} style={{ background: "rgba(255,255,255,0.05)" }}>🔔</span>
          <div><div className={styles.mockName}>{r.n} renews</div><div className={styles.mockMeta}>Reminder scheduled</div></div>
          <span className={styles.mockBadge} style={{ marginLeft: "auto", color: r.c, background: r.bg }}>{r.d}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MockCancel() {
  return (
    <div className={styles.visual}>
      <div className={styles.mockAlert}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div><div className={styles.mockName}>Adobe renews in 2 days</div><div className={styles.mockMeta}>$54.99 · known dark pattern</div></div>
        <span className={styles.mockCancelBtn}>Cancel</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--z-quiet)", margin: "6px 0 12px" }}>HOW TO CANCEL · 6 STEPS</div>
      {["Go to account.adobe.com/plans", "Click Manage plan → Cancel", "Decline the retention offers", "Confirm — check your email"].map((s, i) => (
        <motion.div key={s} style={{ display: "flex", gap: 12, alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--z-line)" }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--z-blue)", width: 22, height: 22, borderRadius: 7, border: "1px solid var(--z-line-hi)", display: "grid", placeItems: "center" }}>{i + 1}</span>
          <span style={{ fontSize: 14, color: "var(--z-text)" }}>{s}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MockPrivacy() {
  return (
    <div className={styles.visual} style={{ display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center", padding: 20 }}>
        <motion.div
          style={{ width: 92, height: 92, borderRadius: 26, margin: "0 auto 22px", display: "grid", placeItems: "center", fontSize: 42, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}
          initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >🔒</motion.div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>Encrypted on device</div>
        <div style={{ color: "var(--z-muted)", fontSize: 14.5, marginTop: 8, maxWidth: 280 }}>Your subscriptions never leave your phone in plain text. No bank connection required.</div>
      </div>
    </div>
  );
}

// ── How it works ────────────────────────────────────────────────────────────
const STEPS = [
  { t: "Connect or import", b: "Link a Gmail inbox or drop in a bank-statement CSV. Zeno scans it on-device and surfaces every recurring charge in seconds." },
  { t: "Review your radar", b: "See everything you pay for in one place — totals, renewal dates, and what&rsquo;s coming up this week, sorted by urgency." },
  { t: "Cancel before it charges", b: "Get a heads-up days before each renewal and jump straight to the cancellation flow with one tap. Keep what you love, drop the rest." }
];

export function HowItWorks() {
  return (
    <section id="how" className={styles.section}>
      <div className={styles.container}>
        <Reveal>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />How it works</span>
          <h2 className={styles.h2}>From chaos to control in three steps.</h2>
        </Reveal>
        <StaggerGroup className={styles.steps}>
          {STEPS.map((s, i) => (
            <motion.div key={s.t} className={styles.step} variants={staggerChild}>
              <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={styles.stepTitle}>{s.t}</h3>
              <p className={styles.stepBody} dangerouslySetInnerHTML={{ __html: s.b }} />
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

// ── Stats band ──────────────────────────────────────────────────────────────
export function Stats() {
  return (
    <section className={`${styles.sectionTight} ${styles.statsBand}`}>
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          <Reveal><div><div className={`${styles.statVal} ${styles.gradText}`}><CountUp to={219} prefix="$" /></div><div className={styles.statLabel}>Avg. wasted per person / year on forgotten subs</div></div></Reveal>
          <Reveal delay={0.1}><div><div className={styles.statVal}><CountUp to={600} suffix="+" /></div><div className={styles.statLabel}>Services in the cancellation catalog</div></div></Reveal>
          <Reveal delay={0.2}><div><div className={styles.statVal}><CountUp to={3} /></div><div className={styles.statLabel}>Reminders before every renewal</div></div></Reveal>
          <Reveal delay={0.3}><div><div className={`${styles.statVal}`} style={{ color: "var(--z-emerald)" }}><CountUp to={0} /></div><div className={styles.statLabel}>Bank logins required</div></div></Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Analytics teaser ──────────────────────────────────────────────────────────
export function AnalyticsTeaser() {
  const bars = [42, 55, 48, 67, 60, 78, 72, 88, 84, 96];
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.teaser}>
          <Reveal>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />The numbers</span>
            <h2 className={styles.h2}>Spending, made&nbsp;legible.</h2>
            <p className={styles.lead}>Behind Zeno is a real analytics engine — MRR, retention, churn and growth, all wired live. Take a look at the same dashboard we run the business on.</p>
            <div style={{ marginTop: 28 }}>
              <Magnetic strength={0.3}>
                <Link href="/analytics" className={`${styles.btn} ${styles.btnGhost}`}>Open live analytics <span aria-hidden>→</span></Link>
              </Magnetic>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className={styles.teaserCard}>
              <div className={styles.teaserKpis}>
                <div className={styles.teaserKpi}><div className={styles.teaserKpiLabel}>MRR</div><div className={styles.teaserKpiVal} style={{ color: "var(--z-emerald)" }}>$183k</div></div>
                <div className={styles.teaserKpi}><div className={styles.teaserKpiLabel}>Active</div><div className={styles.teaserKpiVal}>48.2k</div></div>
                <div className={styles.teaserKpi}><div className={styles.teaserKpiLabel}>Churn</div><div className={styles.teaserKpiVal} style={{ color: "var(--z-rose)" }}>2.1%</div></div>
              </div>
              <div className={styles.teaserBars}>
                {bars.map((h, i) => (
                  <motion.div key={i} className={styles.teaserBar} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
// Pricing logic: Zeno is a money-SAVING app, so every paid tier is anchored to
// the ~$219/yr the average person wastes on forgotten subscriptions — each plan
// pays for itself by cancelling a single thing. Annual is the default (the
// product is about annual renewals), priced at ~2 months free vs monthly. Tiers
// roughly double in scope (1 person → household → team) so they don't cannibalise.
type Plan = {
  name: string; monthly: number; annual: number;
  blurb: string; meta?: string; payback: string;
  features: string[]; featured?: boolean;
};
const PLANS: Plan[] = [
  {
    name: "Free", monthly: 0, annual: 0,
    blurb: "Enough to stop the bleeding on a handful of subscriptions.",
    meta: "No card required",
    payback: "$0 — no trial, no catch",
    features: ["Track up to 10 subscriptions", "7 / 3 / day-of renewal reminders", "Full cancellation guides", "On-device & encrypted"]
  },
  {
    name: "Pro", monthly: 4.99, annual: 39.99, featured: true,
    blurb: "The full radar — unlimited tracking, auto-discovery and the analytics to see where the money goes.",
    payback: "Pays for itself the first thing you cancel",
    features: ["Unlimited subscriptions", "Gmail + bank-statement discovery", "Spend analytics & insights", "Priority cancellation guides", "Multiple inboxes"]
  },
  {
    name: "Family", monthly: 8.99, annual: 74.99,
    blurb: "One dashboard for the whole household, with per-person breakdowns.",
    meta: "Up to 5 members · ~$1.25 / person / mo",
    payback: "Everything in Pro, shared",
    features: ["Up to 5 members", "Shared family vault", "Per-member spend breakdowns", "Everything in Pro"]
  },
  {
    name: "Business", monthly: 14.99, annual: 129.99,
    blurb: "See and control SaaS spend across your team, with seats, roles and exports.",
    meta: "Up to 10 seats · more on request",
    payback: "Cheaper than one unused SaaS seat",
    features: ["Up to 10 team seats & roles", "SaaS spend reporting", "CSV / API export", "Priority support", "Everything in Family"]
  }
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.sectionGlow} style={{ width: 500, height: 500, bottom: 0, right: -150, background: "rgba(52,211,153,0.12)" }} />
      <div className={styles.container}>
        <Reveal>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Pricing</span>
          <h2 className={styles.h2}>It pays for itself, or it&rsquo;s&nbsp;free.</h2>
          <p className={styles.lead}>The average person wastes <strong style={{ color: "var(--z-text)" }}>~$219 a year</strong> on subscriptions they forgot about. Zeno Pro costs less than that in full — cancel one thing and it&rsquo;s already paid for. Start free, upgrade only when it earns it.</p>
        </Reveal>

        <Reveal delay={0.05}>
          <div className={styles.billingToggle} role="group" aria-label="Billing period">
            <button className={`${styles.billingBtn} ${!annual ? styles.billingBtnActive : ""}`} aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button>
            <button className={`${styles.billingBtn} ${annual ? styles.billingBtnActive : ""}`} aria-pressed={annual} onClick={() => setAnnual(true)}>
              Annual <span className={styles.billingSave}>2 months free</span>
            </button>
          </div>
        </Reveal>

        <StaggerGroup className={styles.pricing}>
          {PLANS.map((p) => {
            const free = p.monthly === 0;
            const perMo = annual ? p.annual / 12 : p.monthly;
            const savePct = free ? 0 : Math.round((1 - p.annual / (p.monthly * 12)) * 100);
            return (
              <motion.div key={p.name} className={`${styles.priceCard} ${p.featured ? styles.priceCardFeatured : ""}`} variants={staggerChild}>
                {p.featured ? <span className={styles.priceTag}>Most popular</span> : null}
                <div className={styles.priceName}>{p.name}</div>

                <div className={styles.priceAmt}>
                  {free ? "$0" : money(perMo)}<span>{free ? "" : " /mo"}</span>
                </div>
                <div className={styles.priceBilled}>
                  {free
                    ? "Free forever"
                    : annual
                      ? <>billed {money(p.annual)}/yr <span className={styles.priceSavePill}>save {savePct}%</span></>
                      : <>or {money(p.annual)}/yr</>}
                </div>

                <div className={styles.priceDesc}>{p.blurb}</div>
                {p.meta ? <div className={styles.priceMeta}>{p.meta}</div> : null}

                <ul className={styles.priceFeatures}>
                  {p.features.map((f) => (
                    <li key={f} className={styles.priceFeature}><span className={styles.priceFeatureDot}>✓</span>{f}</li>
                  ))}
                </ul>

                <div className={styles.pricePayback}>{p.payback}</div>
                <a href="#waitlist" className={`${styles.btn} ${p.featured ? styles.btnPrimary : styles.btnGhost}`}>
                  {free ? "Start free" : "Join waitlist"}
                </a>
              </motion.div>
            );
          })}
        </StaggerGroup>

        <Reveal delay={0.1}>
          <p className={styles.priceFootnote}>
            Founding-waitlist members get <strong style={{ color: "var(--z-text)" }}>Pro free for 3 months</strong> at launch. Cancel anytime — ironically, in one tap. Prices in USD, billed via the App Store / Google Play.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
// FAQ copy lives in ./faq-data so the server-rendered FAQPage JSON-LD (in
// app/page.tsx) and this client accordion share one source of truth.

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container} style={{ maxWidth: 820 }}>
        <Reveal>
          <span className={styles.eyebrow}><span className={styles.eyebrowDot} />FAQ</span>
          <h2 className={styles.h2}>Questions, answered.</h2>
        </Reveal>
        <div className={styles.faqList}>
          {FAQS.map((f, i) => (
            <div key={f.q} className={styles.faqItem}>
              <button id={`faq-q-${i}`} className={styles.faqQ} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-a-${i}`}>
                <span dangerouslySetInnerHTML={{ __html: f.q }} />
                <span className={styles.faqIcon} style={{ transform: open === i ? "rotate(45deg)" : "none" }}>+</span>
              </button>
              <AnimatePresence initial={false}>
                {open === i ? (
                  <motion.div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className={styles.faqA} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                    <p className={styles.faqAInner} dangerouslySetInnerHTML={{ __html: f.a }} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
export function FinalCTA() {
  return (
    <section id="waitlist" className={styles.section}>
      <div className={styles.container}>
        <Reveal>
          <div className={styles.finalCta}>
            <div className={styles.finalInner}>
              <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Coming soon to iOS &amp; Android</span>
              <h2 className={styles.h2} style={{ marginTop: 22 }}>Stop paying for things<br />you forgot about.</h2>
              <p className={styles.lead} style={{ margin: "18px auto 32px" }}>Join the waitlist and be first in line when Zeno launches. Founding members get 3 months of Pro, free.</p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <WaitlistForm />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
