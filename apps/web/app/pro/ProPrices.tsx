"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NO_PRICES, formatPrice, parsePriceList, productName, type PriceList, type PricedProduct } from "@/lib/checkout-api";
import { openCheckout } from "@/lib/razorpay-checkout";
import styles from "@/components/site/content.module.css";

// The part of /pro that depends on what is configured right now (D24). The page
// around it is prerendered, as every page on this site is — that is what gives
// each one its own hashed script policy — so the prices are asked for here, on
// load, from our own origin. A price change on the API then shows up without
// rebuilding the site.
//
// Until the answer arrives, and whenever it says nothing is for sale, this
// renders where Pro can actually be bought. It never renders a price it was not
// given, and never a button that cannot take money.
//
// Signing in uses the CODE from the sign-in email, not the link: that link is
// `zeno://auth/verify`, a deep link into the app, which is no use to someone
// paying on a laptop.
type Step = "browse" | "email" | "code" | "confirm" | "paying" | "done";

export function ProPrices(): React.JSX.Element {
  const [prices, setPrices] = useState<PriceList>(NO_PRICES);
  const [step, setStep] = useState<Step>("browse");
  const [chosen, setChosen] = useState<PricedProduct | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const response = await fetch("/api/checkout/prices", { headers: { accept: "application/json" } });
        if (!response.ok) return;
        const parsed = parsePriceList(await response.json());
        if (live) setPrices(parsed);
      } catch {
        // Nothing for sale is the safe answer and already the state.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!prices.configured || prices.products.length === 0) {
    return (
      <>
        <h2>Where to get it today</h2>
        <p>
          Pro is not on sale on this website yet. It is available inside the Zeno app, through the App Store or Google Play, where you can
          also start on the free plan and upgrade later. This page will offer it directly when direct sales open.
        </p>
      </>
    );
  }

  const choose = (product: PricedProduct) => {
    setChosen(product);
    setError("");
    setStep(token ? "confirm" : "email");
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Could not send the code.");
      setStep("code");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const body = (await response.json()) as { accessToken?: string; error?: string };
      if (!response.ok || !body.accessToken) throw new Error(body.error ?? "That code did not work.");
      setToken(body.accessToken);
      setStep("confirm");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!chosen) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ product: chosen.product, currency: prices.currency, acceptedImmediateAccess: consent })
      });
      const body = (await response.json()) as { orderId?: string; amountMinor?: number; currency?: string; keyId?: string; error?: string };
      if (!response.ok || !body.orderId || !body.keyId || typeof body.amountMinor !== "number") {
        throw new Error(body.error ?? "Could not start the checkout.");
      }
      setStep("paying");
      const outcome = await openCheckout(
        { orderId: body.orderId, amountMinor: body.amountMinor, currency: body.currency ?? prices.currency, keyId: body.keyId },
        email,
        productName(chosen.product)
      );
      if (outcome.status === "paid") {
        setStep("done");
      } else {
        // Dismissed or declined: back to the same button, nothing lost. The
        // order stays open at Razorpay and is simply never paid.
        setStep("confirm");
        setError(outcome.status === "failed" ? outcome.reason : "");
      }
    } catch (reason) {
      setStep("confirm");
      setError(reason instanceof Error ? reason.message : "Could not start the checkout.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done") {
    return (
      <>
        <h2>Pro is on</h2>
        <p>
          Thank you. Open Zeno on your phone and sign in with <strong>{email}</strong>; Pro is already on the account. A receipt is on its
          way from Razorpay.
        </p>
        <p>
          Nothing renews: what you bought runs its term and stops. The <Link href="/legal/refunds">refunds and cancellations policy</Link>{" "}
          says what happens if something is wrong.
        </p>
      </>
    );
  }

  return (
    <>
      <h2>Buy it here</h2>
      <p>
        A purchase here is a single payment for a fixed term. It does <strong>not</strong> renew, no card is kept on file, and there is
        nothing to cancel: it runs to the end of the term and stops. Paying here rather than in the app also means no app-store fee.
      </p>

      <ul className={styles.list}>
        {prices.products.map((item) => (
          <li key={item.product}>
            <span>{productName(item.product)}</span>
            <span className={styles.tag}>{formatPrice(item.amountMinor, prices.currency)}</span>
            <button type="button" onClick={() => choose(item)} disabled={busy} aria-label={`Buy ${productName(item.product)}`}>
              {chosen?.product === item.product && step !== "browse" ? "Chosen" : "Buy"}
            </button>
          </li>
        ))}
      </ul>

      {step === "email" ? (
        <form onSubmit={send}>
          <h3>First, your Zeno account</h3>
          <p>
            A purchase belongs to an account, so we send a six-digit code to your email and you type it in. Use the same address you use in
            the app, or a new one if you have not started yet.
          </p>
          <label htmlFor="checkout-email">Email address</label>
          <input
            id="checkout-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send the code"}</button>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={verify}>
          <h3>The code we emailed you</h3>
          <p>It is in the message sent to {email}, and it expires in ten minutes.</p>
          <label htmlFor="checkout-code">Code</label>
          <input
            id="checkout-code"
            inputMode="numeric"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
        </form>
      ) : null}

      {step === "confirm" && chosen ? (
        <div>
          <h3>{productName(chosen.product)}, {formatPrice(chosen.amountMinor, prices.currency)}</h3>
          <label htmlFor="checkout-consent">
            <input
              id="checkout-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            I want Zeno Pro to start immediately, and I understand that I lose my right to cancel within fourteen days once it has.
          </label>
          <p>
            If you are in the EU, the EEA or the UK, that right is yours by law and this is the only thing that gives it up. Leave the box
            unticked and you keep it; see the <Link href="/legal/refunds">refunds and cancellations policy</Link>.
          </p>
          <button type="button" onClick={pay} disabled={busy}>
            {busy ? "Starting…" : `Pay ${formatPrice(chosen.amountMinor, prices.currency)}`}
          </button>
        </div>
      ) : null}

      {step === "paying" ? <p role="status">The payment window is open. Finish there, or close it to come back.</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <p>
        Before you buy, please read the <Link href="/legal/refunds">refunds and cancellations policy</Link>: Zeno is digital content you get
        immediately, so website purchases are not refundable except where the law requires it, and the free plan is there to let you decide
        first.
      </p>
    </>
  );
}
