import { CONTACT_EMAIL, SITE_HOST } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import styles from "../legal.module.css";

// W2 (docs/WEB_PLAN.md). Every statement here is one the code makes true:
// what the app sends and to whom is docs/STORE_DATA_SAFETY.md (from the
// release build), how long things are kept is docs/DATA_AND_LOGGING.md, the
// providers are the ones configured in apps/api and apps/web. The operator is
// "Zeno", the name the product trades under (D18). app/truthfulness.test.tsx
// and app/legal/legal-agreement.test.tsx pin the facts that can drift.
export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "What Zeno holds about you and why, what stays on your phone, who processes data for us, how long each thing is kept, and your rights and how to use them.",
  path: "/legal/privacy"
});

const sections = [
  ["who", "1. Who is responsible"],
  ["summary", "2. The short version"],
  ["phone", "3. What stays on your phone"],
  ["collect", "4. What we hold, and why"],
  ["bases", "5. The legal grounds"],
  ["retention", "6. How long we keep things"],
  ["gmail", "7. The Gmail connection"],
  ["coach", "8. The AI spend coach"],
  ["providers", "9. Who processes data for us"],
  ["transfers", "10. Where data goes"],
  ["rights", "11. Your rights, and how to use them"],
  ["regions", "12. If you are in the EU or UK, California, or India"],
  ["children", "13. Children"],
  ["security", "14. Security"],
  ["changes", "15. Changes to this policy"],
  ["contact", "16. Contact"]
];

export default function PrivacyPage() {
  return (
    <>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: October 8, 2026</p>
      <hr className={styles.rule} />

      <p className={styles.lede}>
        This policy says what Zeno holds about you, why, for how long, who else touches it, and what you can do about it. It covers the
        website at {SITE_HOST}, the waitlist, and the Zeno app for iOS and Android.
      </p>

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

      <h2 id="who">1. Who is responsible</h2>
      <p>
        Zeno, the name the service is operated under, decides what personal data the service holds and why, and is responsible for it (the
        &ldquo;controller&rdquo; in European law, the &ldquo;data fiduciary&rdquo; in Indian law). Questions, requests and complaints go to{" "}
        <a href={`mailto:${CONTACT_EMAIL.privacy}`}>{CONTACT_EMAIL.privacy}</a>, which the person responsible for data reads.
      </p>

      <h2 id="summary">2. The short version</h2>
      <ul>
        <li>Your subscription list, notes, renewal dates and the receipts the app reads stay on your phone, encrypted. Our servers never receive them.</li>
        <li>We never ask for a bank login, and no bank-data aggregator is involved.</li>
        <li>Our servers hold an email address and an account id if you sign in, a display name and a monthly total if you join a household, and the counts of four product events. That is the list.</li>
        <li>The AI coach is off until you turn it on. When you use it, a summary of your subscriptions goes to the AI provider with your question, and nothing is stored.</li>
        <li>Nothing is sold, rented or used for advertising. The website runs no analytics and sets no cookies.</li>
      </ul>

      <h2 id="phone">3. What stays on your phone</h2>
      <p>
        The app writes your subscription list (service names, amounts, billing cycles, renewal and trial dates, categories, notes and tags),
        the budgets you set, your reminder settings, and the connection to any inbox you add into an encrypted store on the device. That store
        is protected by the phone&rsquo;s own secure keystore and, if you turn it on, a PIN and biometrics. Receipts and statements are read on the phone.
        None of this is uploaded to us. Because we do not hold it, we cannot read it, and a breach of our servers cannot expose it. If you lose
        the phone without a backup, we cannot restore it either; the app can export the list as a file whenever you like.
      </p>

      <h2 id="collect">4. What we hold, and why</h2>
      <p>What follows is everything our servers or our providers receive from the website or the app, and the reason for each.</p>
      <ul>
        <li>
          <strong>Waitlist:</strong> when you join, we record your email address and the date and time you signed up, to tell you when the app is available. Kept in a private
          spreadsheet (section 9).
        </li>
        <li>
          <strong>Account:</strong> if you sign in, your email address, or the identity token Apple or Google gives us (which carries your
          email and an id), and an account id we make. Used to sign you in and to tie a paid plan and a household to you. Sign-in tokens are
          stored only as hashes.
        </li>
        <li>
          <strong>Household (Family plan):</strong> the display name you enter and your monthly subscription total with its currency, so the
          household&rsquo;s other members can see them. Not the subscriptions behind the total.
        </li>
        <li>
          <strong>Purchases:</strong> which plan you bought and whether it is active, through Apple, Google and RevenueCat (section 9). We never
          see your card.
        </li>
        <li>
          <strong>The AI coach:</strong> only after you turn it on, the names, categories and monthly amounts of your subscriptions, the
          app&rsquo;s insights about them, and your question, passed to the AI provider to generate an answer and not stored by us (section 8).
        </li>
        <li>
          <strong>Four product events:</strong> an import finishing from CSV or email, a share card being made, the free plan&rsquo;s limit being
          reached, and which plan a purchase was. Sent without an account id or device id; the server keeps only counts, so that we can tell
          whether those features work.
        </li>
        <li>
          <strong>Server logs:</strong> for each request to our servers, the time, the path without its query string, the client&rsquo;s IP
          address, the result and how long it took, and for security events (a sign-in, a sign-out, a refused request) the account id. Never an
          email address, a token, or any subscription data; tests enforce that. Used to keep the service running and to detect abuse.
        </li>
        <li>
          <strong>Crash reports:</strong> none today. The app is built without a crash-reporting key. If we turn reporting on, it will carry a
          stack trace scrubbed of amounts, names, emails and tokens, and this policy will say so first.
        </li>
      </ul>
      <p>
        We do not collect: bank credentials, card numbers, your contacts, your location, advertising identifiers, or your inbox beyond what the
        app reads on the phone (section 7). The website runs no analytics and sets no cookies (<Link href="/legal/cookies">cookie policy</Link>).
      </p>

      <h2 id="bases">5. The legal grounds</h2>
      <ul>
        <li><strong>To provide the service you asked for</strong> (a contract with you): the account, sign-in, households, purchases, the waitlist mail you asked for.</li>
        <li><strong>Your consent</strong>, which you can withdraw at any time in the app: the Gmail connection, the AI coach, joining a household.</li>
        <li><strong>Our legitimate interest</strong> in keeping the service secure and knowing whether it works: server logs, security events, the four product counts. You can object (section 11).</li>
        <li><strong>A legal obligation</strong>, where one applies: tax records of purchases are the stores&rsquo;; a lawful request from an authority is handled as section 9 says.</li>
      </ul>

      <h2 id="retention">6. How long we keep things</h2>
      <ul>
        <li><strong>Waitlist email:</strong> until the app has launched and you have been told, plus a short period after; sooner if you ask.</li>
        <li><strong>Account:</strong> until you delete it in the app, or ask us to. Deletion erases the account, its sign-in tokens, its household membership and its purchase link on our side; it takes effect at once and is tested.</li>
        <li><strong>Sign-in tokens:</strong> an access token lasts 15 minutes and a refresh token 30 days of inactivity; sign-in links and codes expire after 10 minutes.</li>
        <li><strong>Household:</strong> your name and total until you leave or the household is deleted; a household is deleted when its last member leaves.</li>
        <li><strong>AI coach requests:</strong> not stored by us. The provider&rsquo;s own retention is in section 9.</li>
        <li><strong>Product counts:</strong> counts only, with nothing personal in them, kept as long as we need the figures.</li>
        <li><strong>Server logs:</strong> up to 30 days.</li>
        <li><strong>Purchase records:</strong> Apple, Google and RevenueCat keep them under their own policies; we hold only the plan status while your account exists.</li>
      </ul>

      <h2 id="gmail">7. The Gmail connection</h2>
      <p>
        Discovery from email is optional. If you connect a Gmail inbox, the app asks Google for read-only access, and Google gives the app a
        token that is stored in the phone&rsquo;s secure keystore, never on our servers. A scan runs only when you tap scan: the app reads
        billing receipts and renewal notices on the phone to find subscriptions, and reads nothing else. It cannot send, delete or change your
        mail. Nothing from your inbox is sent to us or to anyone. You can disconnect in the app, or revoke the access from your Google account
        at any time.
      </p>
      <p>
        Zeno&rsquo;s use of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited
        Use requirements. That information is used only to show you your subscriptions, and never for advertising. It is not transferred to
        others except as needed to provide that feature, to comply with the law, or as part of a merger or acquisition with notice to you.
      </p>

      <h2 id="coach">8. The AI spend coach</h2>
      <p>
        The coach is off until you turn it on with its consent switch. When you ask it a question, the app sends our server the names,
        categories and monthly amounts of your subscriptions, the app&rsquo;s own insights, your budget cap if you set one, and your
        question. The server passes them to the AI provider in section 9 and returns the answer. We do not store the request or the answer.
        Nothing discovered from your inbox, and not your name, email or any bank data, is included. Turn the switch off and nothing more is
        sent.
      </p>

      <h2 id="providers">9. Who processes data for us</h2>
      <p>These providers handle data on our instructions, each only for the purpose named, and each is used only when the feature that needs it is in use.</p>
      <ul>
        <li><strong>Render</strong> (United States): runs our server and its database. Holds the account, household and product-count data in section 4, and the server logs.</li>
        <li><strong>Netlify</strong> (United States): serves the website, including the waitlist form.</li>
        <li><strong>Google</strong> (United States): the waitlist spreadsheet (Google Sheets, through Google Apps Script); Google Play for the Android app and its billing; Gmail, if you connect an inbox, under your own Google account.</li>
        <li><strong>Apple</strong> (United States): the App Store for the iOS app and its billing, and Sign in with Apple if you use it.</li>
        <li><strong>RevenueCat</strong> (United States): checks purchases with the stores and tells the app which plan is active. Receives the purchase and your account id, or its own anonymous id if you are signed out.</li>
        <li><strong>Resend</strong> (United States): delivers waitlist and sign-in emails. Receives your email address and the message.</li>
        <li><strong>The AI provider</strong> for the coach: <strong>Anthropic (Claude) or Groq</strong>, both in the United States, whichever we have configured (Groq today). Receives what section 8 lists, under that provider&rsquo;s service agreement and data-processing terms.</li>
        <li><strong>Sentry</strong> (United States): crash reporting, not in use today; this policy changes before it is.</li>
      </ul>
      <p>
        We do not sell, rent or trade personal data, and we do not share it for advertising. We disclose data outside this list only if the
        law requires it, to protect someone&rsquo;s safety, or to enforce our terms, and we tell you where we lawfully can.
      </p>

      <h2 id="transfers">10. Where data goes</h2>
      <p>
        Our server and every provider above are in the United States. If you are in the European Economic Area, the United Kingdom,
        Switzerland or India, the data in section 4 is therefore transferred there. For transfers from the EEA, the UK and Switzerland we rely
        on the European Commission&rsquo;s standard contractual clauses (and the UK addendum) with each provider, or on an adequacy decision
        where one covers the provider. Your subscription data is not transferred anywhere, because it never leaves your phone.
      </p>

      <h2 id="rights">11. Your rights, and how to use them</h2>
      <p>Wherever you live, you can:</p>
      <ul>
        <li><strong>See</strong> what we hold about you, and get a copy.</li>
        <li><strong>Correct</strong> it.</li>
        <li><strong>Delete</strong> it: delete your account in the app (Settings), which erases it at once; or email us.</li>
        <li><strong>Export</strong> your subscription list from the app (Settings, &ldquo;Export my data&rdquo;) as a file you can open anywhere.</li>
        <li><strong>Withdraw consent</strong> for the Gmail connection, the coach or a household, in the app, at any time.</li>
        <li><strong>Object</strong> to processing based on our legitimate interests, and ask us to stop.</li>
        <li><strong>Leave the waitlist</strong> by replying to any waitlist email or writing to us.</li>
      </ul>
      <p>
        To use a right we cannot offer in the app, email <a href={`mailto:${CONTACT_EMAIL.privacy}`}>{CONTACT_EMAIL.privacy}</a> from the address
        on your account, so that we know the request is yours. We answer within the time the law where you live allows, which is usually one
        month. We will not treat you differently for using a right.
      </p>

      <h2 id="regions">12. If you are in the EU or UK, California, or India</h2>
      <p>
        <strong>European Union, EEA and United Kingdom.</strong> The grounds in section 5 are the GDPR&rsquo;s. You also have the right to
        restrict processing and to data portability, and the right to complain to your data-protection authority; we would rather hear from
        you first.
      </p>
      <p>
        <strong>California.</strong> We do not sell or share personal information as the CCPA defines those terms, and we do not use it for
        targeted advertising, so there is nothing to opt out of. You have the rights in section 11, including to know, delete and correct, and
        the right not to be discriminated against for using them. An authorised agent may act for you with your written permission.
      </p>
      <p>
        <strong>India.</strong> Under the Digital Personal Data Protection Act, you have the right to access, correct and erase your personal
        data, to withdraw consent, to nominate someone to act for you, and to have a grievance heard. {CONTACT_EMAIL.privacy} is the address
        for grievances. If you are not satisfied with our answer, you may approach the Data Protection Board of India.
      </p>

      <h2 id="children">13. Children</h2>
      <p>
        The service is not for children. We do not knowingly hold an account for anyone under 18, or under 16 where the law that applies lets a
        younger person agree (see the <Link href="/legal/terms">terms</Link>). If you believe a child has an account, write to us and we will
        delete it.
      </p>

      <h2 id="security">14. Security</h2>
      <p>
        Data on the phone is encrypted with a key in the device&rsquo;s secure keystore; the app can be locked with a PIN and biometrics,
        hides its screens while locked, and is excluded from device backups. Every connection uses TLS. On the server, sign-in tokens are
        stored only as hashes, secrets live only in the server&rsquo;s environment, and logs are tested to contain no personal data. The
        server and the app are checked against the OWASP application and mobile security standards, and we publish a security.txt file for
        researchers. No system is perfectly secure; if we learn of a breach that affects you, we will tell you and any authority the law
        requires, without undue delay.
      </p>

      <h2 id="changes">15. Changes to this policy</h2>
      <p>
        When this policy changes, the date at the top changes with it. For a change that affects what we hold or why, we tell you in the app
        or by email before it takes effect, and where the law requires your consent, we ask for it.
      </p>

      <h2 id="contact">16. Contact</h2>
      <p>
        Data and privacy: <a href={`mailto:${CONTACT_EMAIL.privacy}`}>{CONTACT_EMAIL.privacy}</a>. Security:{" "}
        <a href={`mailto:${CONTACT_EMAIL.security}`}>{CONTACT_EMAIL.security}</a>. Anything else:{" "}
        <a href={`mailto:${CONTACT_EMAIL.feedback}`}>{CONTACT_EMAIL.feedback}</a>.
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
