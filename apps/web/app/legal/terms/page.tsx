import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Zeno",
  description:
    "The terms for using Zeno — a subscription manager that helps you find, track, and cancel subscriptions. Pre-launch terms; finalized at launch.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/legal/terms" },
  openGraph: {
    title: "Terms of Service | Zeno",
    description: "The terms for using Zeno, the subscription radar. Pre-launch; finalized at launch.",
    type: "website"
  }
};

const sections = [
  ["acceptance", "1. Acceptance of these terms"],
  ["service", "2. Description of the Service"],
  ["pre-launch", "3. Waitlist & pre-launch"],
  ["eligibility", "4. Eligibility"],
  ["acceptable-use", "5. Acceptable use"],
  ["plans", "6. Plans & billing"],
  ["your-subscriptions", "7. Your own subscriptions & cancellations"],
  ["disclaimers", "8. Disclaimers"],
  ["liability", "9. Limitation of liability"],
  ["termination", "10. Termination"],
  ["changes", "11. Changes to these terms"],
  ["governing-law", "12. Governing law"],
  ["contact", "13. Contact us"]
];

export default function TermsPage() {
  return (
    <>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Terms of Service</h1>
      <p className={styles.updated}>Last updated: June 13, 2026</p>
      <hr className={styles.rule} />

      <p className={styles.lede}>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Zeno website, the Zeno
        waitlist, and the Zeno mobile app (together, the &ldquo;Service&rdquo;). Please read them
        carefully — by using the Service you agree to them.
      </p>

      <div className={styles.note}>
        <strong>Pre-launch notice.</strong> Zeno is not yet generally available; we are currently
        operating a waitlist. These Terms cover your use of the website and waitlist today, and
        describe the terms that will apply to the app. The final Terms governing the launched app
        — including plan pricing and billing details — will be published before the app becomes
        available and will supersede this draft.
      </div>

      <nav className={styles.toc} aria-label="Table of contents">
        <p className={styles.tocHeading}>On this page</p>
        <ul className={styles.tocList}>
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="acceptance">1. Acceptance of these terms</h2>
      <p>
        By accessing the website, joining the waitlist, or using the Zeno app, you agree to be
        bound by these Terms and by our{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>. If you do not agree, please do not use
        the Service. If you are using the Service on behalf of an organization, you represent that
        you are authorized to accept these Terms on its behalf.
      </p>

      <h2 id="service">2. Description of the Service</h2>
      <p>
        Zeno is a subscription manager. It helps you <strong>find</strong> recurring charges you
        may have forgotten, <strong>warns you before renewals</strong> and free-trial conversions,
        and <strong>helps you cancel</strong> what you no longer want. Zeno does this without
        requiring your bank login, and your subscription data is stored encrypted on your device.
      </p>
      <p>
        Zeno is a tool to help you stay informed and act. It does not control your relationships
        with the companies you subscribe to, and it cannot guarantee a particular outcome with any
        merchant.
      </p>

      <h2 id="pre-launch">3. Waitlist & pre-launch</h2>
      <p>
        The waitlist lets you register interest and be notified when Zeno is available. Joining the
        waitlist does not guarantee access, a launch date, or any particular feature or price. We
        may change, delay, or discontinue planned features before launch.
      </p>

      <h2 id="eligibility">4. Eligibility</h2>
      <p>
        You must be at least 16 years old (or 13 where permitted by local law with appropriate
        consent) to use the Service, and you must be able to form a binding contract. You agree to
        provide accurate information and to keep your account secure.
      </p>

      <h2 id="acceptable-use">5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for any unlawful, fraudulent, or harmful purpose;</li>
        <li>attempt to access accounts or data that are not yours, or to breach our security;</li>
        <li>reverse engineer, scrape, or interfere with the Service except as permitted by law;</li>
        <li>use the Service to infringe anyone&rsquo;s rights or to send spam or malware; or</li>
        <li>misuse waitlist sign-ups, including submitting addresses that are not yours.</li>
      </ul>

      <h2 id="plans">6. Plans & billing</h2>
      <p>
        At launch, Zeno expects to offer the following tiers. Final names, features, and prices
        will be confirmed at launch:
      </p>
      <ul>
        <li><strong>Free</strong> — core subscription tracking and renewal reminders;</li>
        <li><strong>Pro</strong> — advanced discovery, deeper insights, and cancellation guides;</li>
        <li><strong>Family</strong> — Pro features shared across a household;</li>
        <li><strong>Business</strong> — tools for teams managing recurring spend.</li>
      </ul>
      <p>
        Paid plans will be <strong>billed through the Apple App Store or Google Play</strong> at
        launch, subject to those stores&rsquo; terms. Subscriptions to a paid Zeno plan renew
        automatically unless cancelled, and you manage or cancel them through your app-store
        account. Refunds are handled according to the applicable app store&rsquo;s policies.
      </p>

      <h2 id="your-subscriptions">7. Your own subscriptions & cancellations</h2>
      <p>
        Zeno helps you find and cancel <em>your own</em> third-party subscriptions, but{" "}
        <strong>you remain responsible for them</strong>. Where Zeno provides cancellation guides
        or one-tap actions, it is assisting you — you are the one cancelling, and you are
        responsible for confirming that a cancellation succeeded and for any charges that occur.
        Renewal dates, trial windows, and amounts shown in Zeno are estimates based on available
        information and may not always be exact.
      </p>
      <p>
        Zeno does not provide financial, tax, accounting, or legal advice. The information in the
        app is for general guidance only; decisions about your money are yours.
      </p>

      <h2 id="disclaimers">8. Disclaimers</h2>
      <p>
        The Service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>{" "}
        without warranties of any kind, whether express or implied, including warranties of
        merchantability, fitness for a particular purpose, and non-infringement. We do not warrant
        that the Service will be uninterrupted, error-free, or that every subscription will be
        detected or every cancellation completed.
      </p>
      <p>
        Some features — including the AI spend coach — generate suggestions automatically. Anything
        the coach produces is <strong>general information, not financial advice</strong>; it may be
        incomplete or inaccurate, and you should review it before acting on it.
      </p>

      <h2 id="liability">9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Zeno and its team will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or for any loss of
        profits, savings, data, or goodwill, arising out of or related to your use of the Service.
        To the extent liability cannot be excluded, our total liability is limited to the greater
        of the amount you paid us for the Service in the twelve months before the claim, or USD 50.
        Some jurisdictions do not allow certain limitations, so some of these may not apply to you.
      </p>

      <h2 id="termination">10. Termination</h2>
      <p>
        You may stop using the Service at any time, leave the waitlist, or delete the app. We may
        suspend or terminate access if you breach these Terms or to protect the Service or other
        users. Provisions that by their nature should survive termination — such as disclaimers and
        limitations of liability — will survive.
      </p>

      <h2 id="changes">11. Changes to these terms</h2>
      <p>
        We may update these Terms as the Service develops, and we will publish finalized Terms
        before the app launches. When changes are material we will update the
        &ldquo;Last updated&rdquo; date and, where appropriate, notify you. Continued use of the
        Service after changes take effect means you accept the updated Terms.
      </p>

      <h2 id="governing-law">12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which Zeno is established,
        without regard to its conflict-of-laws rules, and the courts located there will have
        jurisdiction over disputes, except where local consumer-protection law gives you the right
        to bring a claim where you live. The specific governing law and venue will be confirmed in
        the finalized Terms published at launch.
      </p>

      <h2 id="contact">13. Contact us</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href="mailto:legal@zeno.app">legal@zeno.app</a>.
      </p>

      <div className={styles.crosslinks}>
        <span>Related:</span>
        <Link href="/legal/privacy">Privacy Policy</Link>
        <Link href="/legal/terms">Terms of Service</Link>
        <Link href="/legal/cookies">Cookie Policy</Link>
      </div>
    </>
  );
}
