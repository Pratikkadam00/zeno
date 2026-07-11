"use client";

// Zeno homepage sections — "The Audit". Every number is computed from the
// real catalog (passed down from the server — the catalog never enters this
// client bundle) or typed by the visitor in the hero.
//
// Motion mirrors the approved animated preview ("The Pen Pass"): section
// heads rule themselves in, headlines print word by word, exhibit digits
// roll like counter wheels, vertical bars draw top-down, the refusal's
// dotted leaders draw before their verdicts print. The page's verified
// celebration lives INSIDE the hero ledger's cancel flow (Hero.tsx) — no
// standalone stamp here; joining a waitlist is an entry, not a win.
//
// SLOP AUDIT (page-level) — ① Zeno: exhibits with citations instead of a
// stats band; pricing printed as a bill with no popularity badge and no
// toggle theater; ledger paper + desk alternation instead of card sections.
// ② Tempted by: feature cards + logo wall + testimonial grid. ③ Lazy
// version: the hero+3-cards+pricing-table template this file used to be.

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { DrawBar, MaskLines, Odometer, PenHead, PenLedgerLine, PrintIn, StaggerGroup, Tally, WordsIn, staggerChild } from "./primitives";
import { LedgerLine, TickTag } from "./ledger";
import { WaitlistForm } from "./WaitlistForm";
import styles from "../../app/home.module.css";

export type CaseStats = {
  total: number;
  hardCount: number;
  quote?: { service: string; step: string } | null;
};

/* ── The case — the industry, on the record ──────────────────────────── */
export function TheCase({ stats }: { stats: CaseStats }) {
  return (
    <section id="case" className={styles.section}>
      <div className={styles.container}>
        <PenHead>THE CASE · FROM OUR OWN CATALOG</PenHead>
        <WordsIn className={styles.h2} text={"The subscription industry\ncounts on you not counting."} />
        <PrintIn delay={0.18}>
          <p className={styles.lead}>
            We index how subscriptions actually get cancelled. The record isn&rsquo;t flattering — and every figure below is computed from that catalog, not
            invented for a landing page.
          </p>
        </PrintIn>
        <div className={styles.exhibits}>
          <PrintIn>
            <span className={styles.exhibitKick}>EXHIBIT A</span>
            <div className={styles.exhibitVal}>
              <Odometer value={stats.total} />
            </div>
            <p className={styles.exhibitBody}>Services indexed in Zeno&rsquo;s cancellation catalog — each with real, step-by-step cancellation instructions.</p>
            <cite className={styles.exhibitCite}>ZENO CANCELLATION CATALOG · JULY 2026</cite>
          </PrintIn>
          <PrintIn delay={0.12}>
            <span className={styles.exhibitKick}>EXHIBIT B</span>
            <div className={styles.exhibitVal}>
              <Odometer value={stats.hardCount} />
            </div>
            <p className={styles.exhibitBody}>
              Of them rate their cancellation <em>hard</em> — or use documented dark patterns to keep you paying.
            </p>
            <cite className={styles.exhibitCite}>DIFFICULTY RATINGS, SAME CATALOG</cite>
          </PrintIn>
          <PrintIn delay={0.24}>
            <span className={styles.exhibitKick}>EXHIBIT C</span>
            {stats.quote ? (
              <>
                <blockquote className={styles.exhibitQuote}>
                  <DrawBar delay={0.24} />
                  &ldquo;{stats.quote.step}&rdquo;
                </blockquote>
                <cite className={styles.exhibitCite}>STEP 1 OF CANCELLING {stats.quote.service.toUpperCase()} — VERBATIM FROM OUR GUIDE</cite>
              </>
            ) : (
              <>
                <blockquote className={styles.exhibitQuote}>
                  <DrawBar delay={0.24} />
                  Retention offers, hidden links, chat-only cancellation.
                </blockquote>
                <cite className={styles.exhibitCite}>PATTERNS DOCUMENTED ACROSS THE CATALOG</cite>
              </>
            )}
          </PrintIn>
        </div>
      </div>
    </section>
  );
}

/* ── The method — how the audit works ────────────────────────────────── */
const METHOD = [
  {
    t: "Discover — on your command",
    b: "Scan email receipts in an inbox you connect, or import a bank-statement CSV you export yourself. Zeno reads them on your device and scans only when you tap scan — no background collection, no bank login."
  },
  {
    t: "Warn — before it charges",
    b: "Seven days out, three days out, and the morning of. Every reminder carries the exact amount about to leave your account, with quiet hours respected."
  },
  {
    t: "Cancel — and verify",
    b: "One tap opens the service's real cancellation steps, dark-pattern traps flagged. Then Zeno checks your next receipt or statement — nothing is called cancelled until the charge actually stops."
  }
];

export function Method() {
  return (
    <section id="how" className={`${styles.section} ${styles.desk}`}>
      <div className={styles.container}>
        <PenHead>THE METHOD</PenHead>
        <WordsIn className={styles.h2} text="An audit, not an app tour." />
        <StaggerGroup className={styles.methodGrid}>
          {METHOD.map((s, i) => (
            <m.div key={s.t} className={styles.methodRule} variants={staggerChild}>
              <span className={styles.methodNum}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={styles.methodTitle}>{s.t}</h3>
              <p className={styles.methodBody}>{s.b}</p>
            </m.div>
          ))}
        </StaggerGroup>
        {/* No stamp here: the page's verified moment is EARNED inside the
            hero ledger's cancel flow. A stamp for reading a section would
            cheapen the one the app makes you work for. */}
      </div>
    </section>
  );
}

/* ── The refusal — privacy as a line item ─────────────────────────────── */
export function Refusal() {
  return (
    <section id="refusal" className={`${styles.section} ${styles.ruled}`}>
      <div className={styles.container}>
        <div className={styles.refusalGrid}>
          <div>
            <PenHead>THE REFUSAL</PenHead>
            <WordsIn className={styles.h2} text="Built for people who refuse to hand a bank login to an app." />
            <PrintIn delay={0.18}>
              <p className={styles.lead}>
                Most subscription apps start by asking for your bank credentials. Zeno is built on refusing to — discovery works from receipts and statements
                you already control.
              </p>
            </PrintIn>
            <PrintIn delay={0.28}>
              <div style={{ marginTop: 28 }}>
                <Link href="/compare/no-bank-login" className={`${styles.btn} ${styles.btnGhost}`}>
                  See the no-bank-login comparison <span aria-hidden>→</span>
                </Link>
              </div>
            </PrintIn>
          </div>
          <div className={styles.refusalLines}>
            <PenLedgerLine label="Bank login" value="NEVER" valueColor="var(--stamp-verified)" />
            <PenLedgerLine delay={0.09} label="Your credentials" value="NOT ASKED FOR" valueColor="var(--stamp-verified)" />
            <PenLedgerLine delay={0.18} label="Background scanning" sub="SCANS RUN WHEN YOU TAP SCAN" value="NONE" valueColor="var(--stamp-verified)" />
            <PenLedgerLine delay={0.27} label="Data brokers" value="ZERO" valueColor="var(--stamp-verified)" />
            <PenLedgerLine delay={0.36} label="Your data" sub="ENCRYPTED ON YOUR DEVICE" value="YOURS" strong />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Analytics teaser (flag-gated by the server) ─────────────────────── */
export function AnalyticsTeaser() {
  return (
    <section className={styles.section} style={{ paddingTop: 0 }}>
      <div className={styles.container}>
        <div className={styles.teaser}>
          <div>
            <PenHead>THE BACK OFFICE</PenHead>
            <WordsIn className={styles.h2} text="Spending, made legible." />
            <PrintIn delay={0.18}>
              <p className={styles.lead}>Behind Zeno is a real analytics engine. Explore the interactive dashboard — shown with sample data, and labeled that way.</p>
            </PrintIn>
            <PrintIn delay={0.28}>
              <div style={{ marginTop: 28 }}>
                <Link href="/analytics" className={`${styles.btn} ${styles.btnGhost}`}>
                  Open the sample dashboard <span aria-hidden>→</span>
                </Link>
              </div>
            </PrintIn>
          </div>
          <PrintIn delay={0.08}>
            <div className={styles.teaserPanel}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <TickTag tone="neutral" hollow>
                  Sample data
                </TickTag>
              </div>
              <LedgerLine label="MRR" value="$183k" valueColor="var(--green-text)" />
              <LedgerLine label="Active" value="48.2k" />
              <LedgerLine label="Churn" value="2.1%" valueColor="var(--stamp-alert)" />
            </div>
          </PrintIn>
        </div>
      </div>
    </section>
  );
}

/* ── The honest bill — pricing as a ledger, no dark patterns ─────────── */
// Verified against the shipped in-app paywall (apps/mobile paywall +
// RevenueCat config): Free / Pro $3.99 mo · $29.99 yr / Lifetime $79.99
// once / Family $6.99 mo. Pro's ONLY gates are unlimited subscriptions,
// category budgets and envelope budgeting. No "most popular" badge (the
// product is pre-launch — popularity claims would be invented) and no
// billing toggle: the bill states both figures plainly, like a bill.
type Plan = {
  name: string;
  blurb: string;
  meta?: string;
  features: string[];
  featured?: boolean;
  price: { free?: true; to?: number; unit?: string };
  billed: string;
};
const PLANS: Plan[] = [
  {
    name: "Free",
    blurb: "Enough to stop the bleeding — and it stays free.",
    meta: "No card required",
    features: ["Track up to 10 subscriptions", "7 / 3 / day-of renewal reminders", "Cancellation guides + verification", "Insights, encrypted on device"],
    price: { free: true },
    billed: "Free forever"
  },
  {
    name: "Pro",
    featured: true,
    blurb: "The full ledger. Everything in Free stays free — Pro adds exactly three things.",
    features: ["Unlimited subscriptions", "Category budgets", "Envelope budgeting", "Everything in Free, included"],
    price: { to: 2.5, unit: " /mo" },
    billed: "Billed $29.99/yr · or $3.99 monthly"
  },
  {
    name: "Lifetime",
    blurb: "Pay once, own it forever. We're a subscription app that will sell you a way out of subscriptions.",
    meta: "YNAB charges $109 every year. This is once.",
    features: ["Everything in Pro", "One payment — yours forever", "No recurring charge, ever"],
    price: { to: 79.99, unit: " once" },
    billed: "One payment · yours forever"
  },
  {
    name: "Family",
    blurb: "One household ledger, up to five people — members share totals, never their lists.",
    meta: "Up to 5 members · ~$1.40 / person / mo",
    features: ["Up to 5 members", "Shared family vault", "Per-member spend totals", "Everything in Pro"],
    price: { to: 6.99, unit: " /mo" },
    billed: "Billed monthly"
  }
];

export function Pricing() {
  return (
    <section id="pricing" className={`${styles.section} ${styles.desk}`}>
      <div className={styles.container}>
        <PenHead>THE HONEST BILL</PenHead>
        <WordsIn className={styles.h2} text="Priced like we mean it." />
        <PrintIn delay={0.18}>
          <p className={styles.lead}>
            Free is genuinely useful, Pro gates exactly three features, and Lifetime exists because we&rsquo;re not ironic about recurring charges. No trial
            countdowns, no guilt copy, no &ldquo;most popular&rdquo; theater.
          </p>
        </PrintIn>
        <div className={styles.pricingList}>
          <PrintIn>
            <div className={styles.planCols}>
              <span>PLAN</span>
              <span>WHAT YOU GET</span>
              <span>PRICE</span>
            </div>
          </PrintIn>
          {PLANS.map((p, i) => (
            <PrintIn key={p.name} delay={i * 0.1}>
              <div className={`${styles.planRow} ${p.featured ? styles.planRowFeatured : ""}`}>
                {p.featured ? <DrawBar color="var(--green)" top={8} bottom={8} delay={0.1} /> : null}
                <div>
                  <div className={styles.planName}>{p.name}</div>
                  <p className={styles.planBlurb}>{p.blurb}</p>
                  {p.meta ? <div className={styles.planMeta}>{p.meta}</div> : null}
                </div>
                <ul className={styles.planFeatures}>
                  {p.features.map((f) => (
                    <li key={f} className={styles.planFeature}>
                      <span className={styles.planTick} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={styles.planPriceWrap}>
                  <div className={styles.planPrice}>
                    {p.price.free ? "$0" : <Tally to={p.price.to!} prefix="$" decimals={2} duration={800} />}
                    <span>{p.price.unit ?? ""}</span>
                  </div>
                  <div className={styles.planBilled}>{p.billed}</div>
                </div>
              </div>
            </PrintIn>
          ))}
        </div>
        <PrintIn delay={0.1}>
          <p className={styles.priceFootnote}>
            Founding-waitlist members get Pro free for 3 months at launch. Cancel anytime — in one tap, obviously. Prices in USD, billed via the App Store /
            Google Play.
          </p>
        </PrintIn>
      </div>
    </section>
  );
}

/* ── FAQ — copy arrives as props so the catalog stays server-side ────── */
export function FAQ({ faqs }: { faqs: ReadonlyArray<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container} style={{ maxWidth: 820 }}>
        <PenHead>QUESTIONS</PenHead>
        <WordsIn className={styles.h2} text="Asked and answered." />
        <PrintIn delay={0.18}>
          <div className={styles.faqList}>
            {faqs.map((f, i) => (
              <div key={f.q} className={styles.faqItem}>
                <button id={`faq-q-${i}`} className={styles.faqQ} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-a-${i}`}>
                  <span dangerouslySetInnerHTML={{ __html: f.q }} />
                  <span className={styles.faqIcon} style={{ transform: open === i ? "rotate(45deg)" : "none" }} aria-hidden>
                    +
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i ? (
                    <m.div
                      id={`faq-a-${i}`}
                      role="region"
                      aria-labelledby={`faq-q-${i}`}
                      className={styles.faqA}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 0.8, 0.26, 1] }}
                    >
                      <p className={styles.faqAInner} dangerouslySetInnerHTML={{ __html: f.a }} />
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </PrintIn>
      </div>
    </section>
  );
}

/* ── Close — the sheet ends here; the footer sits on the page beneath ── */
export function FinalCTA() {
  const reduce = useReducedMotion();
  return (
    <section id="waitlist" className={`${styles.section} ${styles.finalSection}`}>
      <div className={styles.container}>
        <div className={styles.finalWrap}>
          <m.span
            className={styles.bigZeno}
            aria-hidden="true"
            initial={{ opacity: reduce ? 0.05 : 0 }}
            whileInView={{ opacity: 0.05 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 0.8, 0.26, 1] }}
          >
            zeno
          </m.span>
          <PenHead center>COMING SOON TO IOS &amp; ANDROID</PenHead>
          <MaskLines className={styles.h2} delay={0.08} lines={["Stop paying for things", "you forgot about."]} />
          <PrintIn delay={0.26}>
            <p className={styles.lead} style={{ textAlign: "center" }}>
              The audit is free. The waitlist is open. Founding members get 3 months of Pro when we launch.
            </p>
          </PrintIn>
          <div className={styles.finalForm}>
            <PrintIn delay={0.36} style={{ width: "100%", maxWidth: 480 }}>
              <WaitlistForm />
            </PrintIn>
          </div>
        </div>
      </div>
    </section>
  );
}
