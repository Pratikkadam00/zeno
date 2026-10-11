import { CONTACT_EMAIL } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import styles from "../legal.module.css";

// D25 (docs/OWNER_ACTIONS.md): the owner chose "no refunds except where the law
// requires" for purchases made on the website. This page says that plainly and
// then says, exactly, which laws require one — a policy whose exceptions are
// vague is the kind that ends in a chargeback.
//
// Two channels now exist and they refund differently (F241): a purchase in the
// app belongs to Apple or Google, a purchase here belongs to Zeno with Razorpay
// as the processor. Every statement here matches what the code does: the web
// products are one-time orders with no mandate (billing-razorpay.ts), so
// nothing bought here auto-renews and there is nothing to cancel.
export const metadata: Metadata = pageMetadata({
  title: "Refunds and cancellations",
  description:
    "Where you bought Zeno decides who refunds you: what the stores handle, what Zeno handles, which laws require a refund whatever this policy says, and how to ask.",
  path: "/legal/refunds"
});

const sections = [
  ["where", "1. Where you bought it decides who refunds you"],
  ["stores", "2. Bought in the app"],
  ["website", "3. Bought on this website"],
  ["law", "4. Refunds the law requires"],
  ["errors", "5. Money taken in error"],
  ["cancel", "6. Cancelling"],
  ["ask", "7. How to ask, and how long it takes"]
];

export default function RefundsPage() {
  return (
    <>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Refunds and Cancellations</h1>
      <p className={styles.updated}>Last updated: October 11, 2026</p>
      <hr className={styles.rule} />

      <p className={styles.lede}>
        Zeno is sold in two places, and they work differently. A purchase made inside the app belongs to Apple or Google. A purchase made on
        this website is ours. This page says which is which, what we do in each case, and which rights you have whatever this policy says.
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

      <h2 id="where">1. Where you bought it decides who refunds you</h2>
      <p>
        If you tapped Upgrade inside the Zeno app, Apple or Google took the payment and the refund is theirs to give. If you paid on this
        website, Zeno took the payment and the refund is ours. Your receipt says which: one comes from Apple or Google, the other from Zeno.
      </p>

      <h2 id="stores">2. Bought in the app</h2>
      <p>
        Apple and Google each have their own refund rules and their own forms, and they decide those cases, not us. Ask them through your
        App Store or Google Play purchase history. If they turn you down and you think the decision is wrong, write to us and we will say
        what we can on your behalf, though the decision stays theirs.
      </p>

      <h2 id="website">3. Bought on this website</h2>
      <p>
        We do not offer discretionary refunds on website purchases. Zeno is digital content you get immediately and in full: there is no
        shipment, nothing to return, and access begins the moment the payment succeeds. The free plan exists so you can decide before you
        pay. It has no time limit, no card, and the same renewal reminders and cancellation guides as Pro.
      </p>
      <p>
        That is the policy, and the next two sections are the exceptions to it. They are not goodwill: they are cases where you are entitled
        to your money whatever this page says.
      </p>

      <h2 id="law">4. Refunds the law requires</h2>
      <p>
        <strong>If you are in the European Union, the European Economic Area or the United Kingdom</strong>, you normally have fourteen days
        to withdraw from a distance purchase of digital content. That right can be given up, and the law lets us ask you to give it up in
        exchange for immediate access, which is what the tick box at checkout does, in those words. If you ticked it, you asked for
        Zeno to start at once and accepted that the fourteen days no longer apply. If you did not, or if we failed to ask, you keep the full
        fourteen days and we refund in full.
      </p>
      <p>
        <strong>Wherever you are</strong>, your local consumer law may give you a remedy we cannot sign away, for example if the
        service is not as described, or is not fit for the purpose we sold it for. In India, a deficiency in a service is a complaint under
        the Consumer Protection Act whatever a seller&rsquo;s policy says. Nothing here takes away a right the law where you live gives you.
      </p>

      <h2 id="errors">5. Money taken in error</h2>
      <p>
        We return money we should never have taken, in full, without argument and without reference to any of the above:
      </p>
      <ul>
        <li>You were charged twice for the same thing.</li>
        <li>You were charged but never got the plan you paid for.</li>
        <li>You were charged an amount other than the one shown at checkout.</li>
      </ul>
      <p>
        Money taken in error was never ours to keep. Tell us and we will send it back.
      </p>

      <h2 id="cancel">6. Cancelling</h2>
      <p>
        <strong>Nothing bought on this website renews.</strong> A year of Pro bought here is a single payment for a year: it runs to the end
        of the term and then stops, and there is no subscription to cancel and no card kept on file for it. Lifetime is a single payment that
        never expires. If you want another year when one ends, you buy another year.
      </p>
      <p>
        A monthly or yearly plan bought <em>inside the app</em> does renew, through Apple or Google, and is cancelled in your App Store or
        Google Play account settings, not inside Zeno and not here. It stays active until the end of the period you have paid for.
      </p>
      <p>
        Cancelling a plan never deletes your data. Deleting your account is a separate thing you do in the app, and it is not a refund
        request: if you want both, ask for the refund first.
      </p>

      <h2 id="ask">7. How to ask, and how long it takes</h2>
      <p>
        Write to <a href={`mailto:${CONTACT_EMAIL.legal}`}>{CONTACT_EMAIL.legal}</a> from the email address on the account, and say what you
        bought and when. You do not need to give a reason for a case under sections 4 or 5.
      </p>
      <p>
        An approved refund goes back the way it came, to the card or account that paid. We send it as soon as we agree it; how quickly it
        appears is then your bank&rsquo;s business, not ours, and a card refund is usually slower than a UPI one.
      </p>
      <p>
        If you think a charge is wrong, please write to us before asking your bank to reverse it. A chargeback takes weeks and locks the
        money while it runs; we can usually settle it the same day.
      </p>
      <p className={styles.updated}>
        See also the <Link href="/legal/terms">terms of service</Link> and the <Link href="/legal/privacy">privacy policy</Link>.
      </p>
    </>
  );
}
