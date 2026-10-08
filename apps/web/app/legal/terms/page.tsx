import { CONTACT_EMAIL, SITE_HOST } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import styles from "../legal.module.css";

// W2 (docs/WEB_PLAN.md). Written for a reader, with the content a lawyer
// expects. The operator is "Zeno", the name the product trades under (D18);
// the governing law is India's, with consumers keeping the protection of
// their own country's law (D19). The plan list and prices are the ones the
// pricing section and the app sell (app/legal/legal-agreement.test.tsx pins
// them). The lawyer's review (OWNER_GUIDE step 13) is the final check.
export const metadata: Metadata = pageMetadata({
  title: "Terms of service",
  description:
    "The terms for using Zeno: what the service is, your account, the plans and prices, billing through the app stores, your rights, and the law that applies.",
  path: "/legal/terms"
});

const sections = [
  ["who", "1. Who we are and what these terms cover"],
  ["service", "2. What Zeno does"],
  ["account", "3. Your account"],
  ["age", "4. Age"],
  ["acceptable-use", "5. Acceptable use"],
  ["plans", "6. Plans, prices and billing"],
  ["cancel", "7. Cancelling a plan and refunds"],
  ["your-subscriptions", "8. Your own subscriptions"],
  ["coach", "9. The AI spend coach"],
  ["licence", "10. Licence and intellectual property"],
  ["stores", "11. Apple and Google"],
  ["changes-to-service", "12. Changes to the service, and ending it"],
  ["liability", "13. Warranties and liability"],
  ["law", "14. Governing law and disputes"],
  ["changes", "15. Changes to these terms"],
  ["contact", "16. Contact"]
];

export default function TermsPage() {
  return (
    <>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Terms of Service</h1>
      <p className={styles.updated}>Last updated: October 8, 2026</p>
      <hr className={styles.rule} />

      <p className={styles.lede}>
        These terms are the agreement between you and Zeno for the website at {SITE_HOST}, the waitlist, and the Zeno app for iOS and
        Android. They are written to be read. If anything is unclear, write to{" "}
        <a href={`mailto:${CONTACT_EMAIL.legal}`}>{CONTACT_EMAIL.legal}</a> before you rely on it.
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

      <h2 id="who">1. Who we are and what these terms cover</h2>
      <p>
        Zeno is the name the service is operated under (&ldquo;Zeno&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). The service is the website at{" "}
        {SITE_HOST}, the waitlist on it, and the Zeno app (together, the &ldquo;Service&rdquo;). By joining the waitlist, creating an account,
        or using the app, you agree to these terms and to the <Link href="/legal/privacy">privacy policy</Link>, which explains what data the
        Service holds and why. If you do not agree, do not use the Service.
      </p>
      <p>
        Until the app is in the App Store and Google Play, the website and the waitlist are the only parts of the Service you can use. The
        sections about the app apply from the day it is available.
      </p>

      <h2 id="service">2. What Zeno does</h2>
      <p>
        Zeno helps you find the subscriptions you pay for, warns you before each one renews or a free trial converts, and walks you through
        cancelling the ones you no longer want. It finds subscriptions in billing receipts from an inbox you connect, in statement files you
        import, and in entries you add yourself. It never asks for your bank login. Your subscription list is stored encrypted on your phone.
      </p>
      <p>
        Zeno is a tool for keeping informed and acting. It does not cancel anything on your behalf, it has no relationship with the
        companies you subscribe to, and it cannot promise a particular outcome with any of them.
      </p>

      <h2 id="account">3. Your account</h2>
      <p>
        The app works without an account for tracking, reminders and cancellation guides. An account is needed for the Family plan and for the
        AI spend coach, and is created by signing in with an email link or code, or with your Apple or Google account. Keep the inbox and
        the devices you sign in with secure: whoever controls them controls the account. One account per person. You can delete your account
        from inside the app at any time; the server then erases what it holds about you (section 6 of the privacy policy says what that is).
      </p>

      <h2 id="age">4. Age</h2>
      <p>
        You must be at least 18 years old to create an account or buy a plan. Where the law that applies to you lets a younger person agree
        to terms like these and to the processing of their data, that age applies instead, but never below 16. We do not knowingly hold an
        account for anyone younger; if you believe we do, write to {CONTACT_EMAIL.privacy} and we will remove it.
      </p>

      <h2 id="acceptable-use">5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for anything unlawful, fraudulent or harmful;</li>
        <li>try to reach accounts, households or data that are not yours, or to get around the Service&rsquo;s security;</li>
        <li>send the Service deliberately malformed or excessive requests, or interfere with it for other people;</li>
        <li>copy the cancellation catalogue or other content of the Service for a competing product;</li>
        <li>join the waitlist with an address that is not yours, or create accounts for other people.</li>
      </ul>
      <p>
        You may study how the app and website behave, and you may report what you find to {CONTACT_EMAIL.security}; we welcome that and
        say so in the site&rsquo;s security.txt file.
      </p>

      <h2 id="plans">6. Plans, prices and billing</h2>
      <p>These are the plans, in US dollars. The same figures appear on the pricing section of the home page and in the app.</p>
      <ul>
        <li>
          <strong>Free</strong>: up to 10 subscriptions, with the renewal reminders, the cancellation guides with verification, and the insights.
          No card required. It stays free.
        </li>
        <li>
          <strong>Pro</strong>: $3.99 a month, or $29.99 a year. Everything in Free, plus unlimited subscriptions, category budgets and envelope
          budgeting.
        </li>
        <li>
          <strong>Lifetime</strong>: $79.99, once. Everything in Pro, with no renewal.
        </li>
        <li>
          <strong>Family</strong>: $6.99 a month for a household of up to five people. Everything in Pro for each member, plus the shared Family
          Vault.
        </li>
      </ul>
      <p>
        Plans are sold and billed by Apple (through the App Store) or Google (through Google Play), under their terms as well as these. Taxes
        may be added by the store according to where you are. A monthly or yearly plan renews automatically at the end of each period at the
        price then shown in the store, until you cancel it. We do not see or hold your card details; the stores handle payment.
      </p>
      <p>
        If a price changes, the store tells you before the next renewal, and where the store&rsquo;s rules require it, asks you to agree. Any
        promotion, such as a free period for people on the waitlist, is described on the website when it is offered, and its conditions are
        the ones stated there.
      </p>

      <h2 id="cancel">7. Cancelling a plan and refunds</h2>
      <p>
        You cancel a monthly or yearly plan in your App Store or Google Play account settings, not inside the app, and it stays active until
        the end of the period you have paid for. Refunds are requested from the store you bought from, under its refund rules; we will help
        where we can.
      </p>
      <p>
        If you live in the European Union, the United Kingdom, or another place that gives consumers a right to withdraw from a purchase of
        digital content within 14 days, that right is yours and is exercised through the store. Nothing in these terms takes away a right
        that consumer law gives you where you live.
      </p>

      <h2 id="your-subscriptions">8. Your own subscriptions</h2>
      <p>
        The subscriptions Zeno tracks are contracts between you and other companies, and they remain your responsibility. The cancellation
        guides describe steps that worked when they were written; companies change their pages, and a guide can be out of date. You are the
        one cancelling, and you are responsible for checking that a cancellation took effect. Zeno marks a cancellation verified only when its
        renewal date passes with no new charge in the receipts or statements you scan or import, so that check is only as complete as the data
        you give it.
      </p>
      <p>
        Renewal dates, trial end dates and amounts are read from receipts, statements and the catalogue, and can be wrong or late. Zeno gives
        no financial, tax, accounting or legal advice. Decisions about your money are yours.
      </p>

      <h2 id="coach">9. The AI spend coach</h2>
      <p>
        The coach is optional and off until you turn it on. When you ask it a question, a summary of your subscriptions (names, categories,
        amounts, and the app&rsquo;s own insights) is sent with your question to the AI provider named in the privacy policy, and its answer
        is returned to you. The answer is generated text: it can be incomplete or wrong, it is general information and not advice, and you
        should check it before acting on it. We do not store your questions or the answers.
      </p>

      <h2 id="licence">10. Licence and intellectual property</h2>
      <p>
        We give you a personal, non-transferable licence to use the app on devices you own or control, for your own subscriptions, under these
        terms and the store&rsquo;s rules. The app, the website, the catalogue, the guides and the names and marks are ours or our licensors&rsquo;
        and stay so. Your subscription data is yours; we claim nothing in it. If you send us feedback, we may use it to improve the Service
        without owing you anything for it.
      </p>

      <h2 id="stores">11. Apple and Google</h2>
      <p>
        These terms are between you and Zeno, not Apple or Google, and Zeno alone is responsible for the app and its content. Apple and Google
        have no obligation to maintain or support the app. If the app fails to conform to a warranty you are owed, you may tell the store, which
        may refund the price you paid; beyond that, the store has no other warranty obligation for the app, and any other claim is ours to
        handle. Zeno, not the store, handles any claim about the app, including product liability, a claim that it fails to meet a legal
        requirement, consumer-protection claims, and a claim that it infringes someone&rsquo;s intellectual property.
      </p>
      <p>
        You confirm that you are not in a country under a United States government embargo or designated a &ldquo;terrorist supporting&rdquo;
        country, and not on a United States government list of prohibited or restricted parties. You must comply with any third-party terms
        that apply when you use the app. Apple and its subsidiaries are third-party beneficiaries of these terms for the iOS app and may
        enforce them against you. The same applies to Google for the Android app, to the extent its terms require it.
      </p>

      <h2 id="changes-to-service">12. Changes to the service, and ending it</h2>
      <p>
        We may add, change or remove features, and we say on the <Link href="/roadmap">roadmap</Link> what is planned and not promised. Joining
        the waitlist does not guarantee access, a launch date or a price. You can stop using the Service, leave the waitlist, or delete your
        account at any time. We may suspend or end your access if you break these terms or to protect the Service or other people, and we will
        tell you why unless the law prevents it. If we ever discontinue the app, we will give notice on the website and in the app where we can,
        and your data on the phone stays yours to export.
      </p>

      <h2 id="liability">13. Warranties and liability</h2>
      <p>
        The Service is provided as is and as available. We do not promise that it will be uninterrupted or free of errors, that every
        subscription will be found, or that every cancellation will go through. To the extent the law allows, we exclude implied warranties
        and are not liable for indirect or consequential loss, or for loss of profit, savings, data or goodwill arising from the Service. Where
        liability cannot be excluded, our total liability to you for all claims together is limited to the greater of the amount you paid for
        the Service in the twelve months before the claim or USD 50.
      </p>
      <p>
        Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot
        be limited under the law that applies to you, and nothing in them removes rights that consumer law gives you.
      </p>

      <h2 id="law">14. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of India, and the courts of India have jurisdiction over disputes about them. If you are a consumer
        living elsewhere, you keep the protection of the mandatory consumer law of the country where you live, and you may bring a claim in the
        courts of that country. Before either of us goes to court, we ask you to write to {CONTACT_EMAIL.legal} so that we can try to put
        things right directly.
      </p>

      <h2 id="changes">15. Changes to these terms</h2>
      <p>
        We may change these terms as the Service changes. For a material change, we give at least 14 days&rsquo; notice before it takes effect,
        by email to the address on your account where we have one, and in the app or on the website. The date at the top of this page says when
        they last changed. If you keep using the Service after a change takes effect, the changed terms apply; if you do not agree with a
        change, stop using the Service or delete your account before that date.
      </p>

      <h2 id="contact">16. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL.legal}`}>{CONTACT_EMAIL.legal}</a>. Questions about your data:{" "}
        <a href={`mailto:${CONTACT_EMAIL.privacy}`}>{CONTACT_EMAIL.privacy}</a>. Security reports:{" "}
        <a href={`mailto:${CONTACT_EMAIL.security}`}>{CONTACT_EMAIL.security}</a>.
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
