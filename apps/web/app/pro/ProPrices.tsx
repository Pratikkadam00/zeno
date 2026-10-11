"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NO_PRICES, formatPrice, parsePriceList, productName, type PriceList } from "@/lib/checkout-api";
import styles from "@/components/site/content.module.css";

// The part of /pro that depends on what is configured right now (D24). The
// page around it is prerendered, as every page on this site is — that is what
// gives each one its own hashed script policy — so the prices are asked for
// here, on load, from our own origin. A price change on the API then shows up
// without rebuilding the site.
//
// Until the answer arrives, and whenever it says nothing is for sale, this
// renders where Pro can actually be bought. It never renders a price it was
// not given, and never a button that cannot take money.
export function ProPrices(): React.JSX.Element {
  const [prices, setPrices] = useState<PriceList>(NO_PRICES);

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
          </li>
        ))}
      </ul>
      <p>
        Before you buy, please read the <Link href="/legal/refunds">refunds and cancellations policy</Link>: Zeno is digital content you get
        immediately, so website purchases are not refundable except where the law requires it, and the free plan is there to let you decide
        first.
      </p>
    </>
  );
}
