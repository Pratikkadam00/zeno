import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Zeno",
  description:
    "How Zeno handles your data: subscription data is encrypted on-device, optional Gmail read-only access stays local, no bank credentials, and we never sell your data.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy | Zeno",
    description:
      "How Zeno handles your data: encrypted on-device, no bank login, and never sold.",
    type: "website"
  }
};

const sections = [
  ["overview", "1. Overview"],
  ["data-we-collect", "2. Data we collect"],
  ["how-we-use", "3. How we use your data"],
  ["on-device", "4. On-device storage & encryption"],
  ["gmail", "5. Optional Gmail access"],
  ["third-parties", "6. Third parties & service providers"],
  ["retention", "7. Data retention"],
  ["your-rights", "8. Your rights & choices"],
  ["children", "9. Children's privacy"],
  ["security", "10. Security"],
  ["waitlist", "11. Waitlist & pre-launch"],
  ["changes", "12. Changes to this policy"],
  ["contact", "13. Contact us"]
];

export default function PrivacyPage() {
  return (
    <>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: June 13, 2026</p>
      <hr className={styles.rule} />

      <p className={styles.lede}>
        Zeno is built on a simple idea: you should be able to understand and control your
        recurring spending without handing over your bank login or your privacy. This policy
        explains what we collect, why, and the choices you have.
      </p>

      <div className={styles.note}>
        <strong>Pre-launch notice.</strong> Zeno is not yet publicly available — we are
        currently collecting a waitlist. Today, the only personal data we hold from most people
        is the email address you give us to join. The app-related practices below describe how
        Zeno will operate at launch, and this policy will be finalized and re-published before
        the app becomes available.
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

      <h2 id="overview">1. Overview</h2>
      <p>
        This Privacy Policy applies to the Zeno marketing website (zeno.app), the Zeno waitlist,
        and the Zeno mobile application once it launches (together, the &ldquo;Service&rdquo;).
        Zeno is operated by the Zeno team (&ldquo;Zeno,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us&rdquo;). By using the Service you agree to the practices described here.
      </p>
      <p>
        Our guiding principles are straightforward: we collect the minimum we need, we keep your
        sensitive financial data encrypted on your device rather than on our servers, we never
        require your bank login, and <strong>we do not sell your personal data</strong>.
      </p>

      <h2 id="data-we-collect">2. Data we collect</h2>
      <h3>Waitlist data</h3>
      <p>
        When you join the waitlist, we collect your <strong>email address</strong> and basic
        technical metadata about the request (such as the date you signed up and the referring
        page). That is all we need to email you about availability.
      </p>
      <h3>In-app subscription data</h3>
      <p>
        Inside the app, Zeno builds a picture of your recurring charges — service names,
        amounts, billing cadence, renewal dates, free-trial end dates, and the notes or tags you
        add. This <strong>subscription data is stored encrypted on your device</strong> and is
        not uploaded to Zeno servers.
      </p>
      <h3>Account & contact data</h3>
      <p>
        If you create a paid Zeno plan at launch, we (or our app-store billing partners) will
        process the information needed to manage that subscription, such as your store account
        identifier and plan status. We do not receive or store your full payment card numbers.
      </p>
      <h3>Diagnostics</h3>
      <p>
        We may collect anonymized, aggregated usage analytics and crash reports to keep the app
        working — for example which screens load slowly or where the app crashes. These are
        designed to avoid identifying you personally and never include your subscription
        contents.
      </p>
      <h3>What we do not collect</h3>
      <ul>
        <li>
          <strong>No bank credentials.</strong> Zeno never asks for, sees, or stores your
          online-banking username, password, or login. Connecting a bank is entirely optional; if
          you choose to, the connection is handled by a regulated account-aggregation provider
          (such as Plaid) that authenticates you directly — Zeno receives only the transaction
          information needed to detect subscriptions, never your credentials.
        </li>
        <li>
          <strong>No full payment card data.</strong> Billing is handled by the app stores.
        </li>
        <li>
          <strong>No sale of data.</strong> We do not sell, rent, or trade your personal
          information, and we do not use it for third-party advertising.
        </li>
      </ul>

      <h2 id="how-we-use">3. How we use your data</h2>
      <p>We use the limited data we hold only to:</p>
      <ul>
        <li>email you about waitlist status, launch availability, and important Service updates;</li>
        <li>operate core app features — detecting subscriptions, sending renewal and trial warnings, and guiding cancellations;</li>
        <li>provide and manage any paid Zeno plan you choose;</li>
        <li>diagnose crashes, fix bugs, and improve performance using aggregated diagnostics;</li>
        <li>protect the Service against fraud, abuse, and security threats; and</li>
        <li>comply with our legal obligations.</li>
      </ul>
      <p>
        We process this data because it is necessary to provide a Service you requested, because
        you have consented (for example to optional analytics or Gmail access), or because we
        have a legitimate interest in keeping the Service secure and reliable.
      </p>

      <h2 id="on-device">4. On-device storage & encryption</h2>
      <p>
        Your subscription data lives on your phone. It is written to an{" "}
        <strong>encrypted on-device store</strong>, protected by your device&rsquo;s secure
        keystore and, where you enable it, a biometric or passcode lock. Because this data is not
        held on Zeno servers, no Zeno employee can read your subscription list, and a breach of
        our infrastructure cannot expose it.
      </p>

      <h2 id="gmail">5. Optional Gmail access</h2>
      <p>
        To help you discover subscriptions you may have forgotten, Zeno can offer{" "}
        <strong>optional, read-only access to your email</strong> (for example a Gmail inbox).
        This is strictly opt-in and works as follows:
      </p>
      <ul>
        <li>access is <strong>read-only</strong> — Zeno can scan for receipts and renewal notices, but cannot send, delete, or modify your mail;</li>
        <li>scanning happens <strong>locally on your device</strong> to identify subscription-related messages; the contents of your inbox are not uploaded to Zeno servers;</li>
        <li>you can <strong>disconnect at any time</strong> from within the app or your Google account settings, which revokes Zeno&rsquo;s access; and</li>
        <li>we only use this access to surface subscriptions to you — never for advertising or profiling.</li>
      </ul>
      <p>
        Zeno&rsquo;s use of information received from Google APIs will adhere to the Google API
        Services User Data Policy, including its Limited Use requirements.
      </p>

      <h2 id="third-parties">6. Third parties & service providers</h2>
      <p>
        We share data only with providers that help us run the Service, and only as needed. These
        may include:
      </p>
      <ul>
        <li><strong>Email delivery</strong> — to send waitlist and account emails;</li>
        <li><strong>App stores</strong> (Apple App Store, Google Play) — for app distribution and billing of paid plans;</li>
        <li><strong>Hosting & infrastructure</strong> — for the website and supporting services;</li>
        <li>
          <strong>AI coaching provider</strong> — if you use the optional AI spend coach, a summary
          of your subscriptions (service names, amounts, categories, and the in-app insights — but
          not your name, email, or bank data) is sent to our AI provider solely to generate
          suggestions and return them to you;
        </li>
        <li>
          <strong>Bank-connection aggregator</strong> (such as Plaid) — only if you opt in to
          connecting a financial account, and only to retrieve transactions for subscription
          detection;
        </li>
        <li><strong>Optional analytics & crash reporting</strong> — using privacy-respecting, aggregated tooling.</li>
      </ul>
      <p>
        These providers are bound to use the data only to perform services for us. We may also
        disclose information if required by law or to protect the rights and safety of users and
        the public.
      </p>

      <h2 id="retention">7. Data retention</h2>
      <p>
        We keep <strong>waitlist emails</strong> until launch and for a reasonable period
        afterward to invite you in, or until you ask us to remove you. <strong>On-device
        subscription data</strong> remains on your device until you delete it or uninstall the
        app. Diagnostic data is retained only as long as needed to investigate issues and is
        then deleted or further aggregated.
      </p>

      <h2 id="your-rights">8. Your rights & choices</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export, or delete
        your personal data, and to object to or restrict certain processing. You can:
      </p>
      <ul>
        <li>unsubscribe from waitlist emails using the link in any email;</li>
        <li>delete on-device data directly in the app, or by uninstalling it;</li>
        <li>disconnect optional Gmail access at any time; and</li>
        <li>
          ask us to access or delete the data we hold by emailing{" "}
          <a href="mailto:privacy@zeno.app">privacy@zeno.app</a>.
        </li>
      </ul>
      <p>We will not discriminate against you for exercising any of these rights.</p>

      <h2 id="children">9. Children&rsquo;s privacy</h2>
      <p>
        Zeno is not directed to children. The Service is intended for users who are at least 16
        years old (or 13 where permitted by local law with appropriate consent). We do not
        knowingly collect personal data from children under these ages. If you believe a child
        has provided us data, contact{" "}
        <a href="mailto:privacy@zeno.app">privacy@zeno.app</a> and we will delete it.
      </p>

      <h2 id="security">10. Security</h2>
      <p>
        We take security seriously. Sensitive subscription data is{" "}
        <strong>encrypted on-device</strong> and can be protected with a{" "}
        <strong>biometric or passcode lock</strong>. Data in transit between the app and any Zeno
        service is encrypted using industry-standard transport security. No system is perfectly
        secure, but our architecture is deliberately designed so the most sensitive data never
        leaves your device.
      </p>

      <h2 id="waitlist">11. Waitlist & pre-launch</h2>
      <p>
        While Zeno is in pre-launch, the waitlist is the primary way we interact with you. We use
        your email only to keep you informed about availability and launch. We will not add you
        to unrelated marketing without your consent, and you can leave the waitlist at any time.
      </p>

      <h2 id="changes">12. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy as the Service evolves — and we will publish a finalized
        version before the app launches. When we make material changes we will update the
        &ldquo;Last updated&rdquo; date above and, where appropriate, notify you by email.
      </p>

      <h2 id="contact">13. Contact us</h2>
      <p>
        Questions about your privacy or this policy? Email us at{" "}
        <a href="mailto:privacy@zeno.app">privacy@zeno.app</a> and we will get back to you.
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
