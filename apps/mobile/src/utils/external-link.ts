import { services } from "@zeno/service-catalog";
import { Linking } from "react-native";
import { getSiteHost } from "../config/site";

// P3.5: the ONE way the app hands a URL to the OS. Only these leave:
//  - https: to an allowlisted host: our site, Apple's App Store, Google search
//    (the cancel guide's fallback), and the hosts of the bundled service
//    catalog's own cancel/website links;
//  - mailto: to exactly one address, with no headers (no ?subject=/&bcc=);
//  - tel: digits, spaces, "+", "-", "(", ")" only (support phone numbers).
// Everything else (http:, javascript:, intent:, file:, another app's scheme, a
// lookalike host, "https://site@evil") is refused, so no URL that reaches a
// call site can turn the app into an open redirect. scripts/external-link-guard
// .test.ts fails if a raw Linking.openURL appears anywhere else.
//
// Parsed with string operations, not `new URL()`: under Hermes, React Native's
// URL does not reliably expose `.host` (see config/site.ts).

const STATIC_HOSTS = ["apps.apple.com", "www.google.com"];
const HTTPS_HOST = /^https:\/\/([A-Za-z0-9.-]+)(?::\d{1,5})?(?:[/?#]|$)/;
const MAILTO = /^mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const TEL = /^tel:\+?[0-9 ()-]{3,20}$/;

let allowedHosts: Set<string> | null = null;

/** The lowercase host of an https URL; null for anything else (incl. userinfo). */
export function httpsHost(url: string): string | null {
  const match = HTTPS_HOST.exec(url);
  return match ? match[1]!.toLowerCase() : null;
}

function hosts(): Set<string> {
  if (!allowedHosts) {
    allowedHosts = new Set([getSiteHost().toLowerCase(), ...STATIC_HOSTS]);
    for (const service of services) {
      for (const link of [service.cancelUrl, service.website]) {
        // A catalog link that isn't https adds no host: it stays unopenable.
        const host = httpsHost(link);
        if (host) allowedHosts.add(host);
      }
    }
  }
  return allowedHosts;
}

export function isAllowedExternalUrl(url: string): boolean {
  if (MAILTO.test(url) || TEL.test(url)) return true;
  const host = httpsHost(url);
  return host !== null && hosts().has(host);
}

/** Opens `url` only if it is allowed; resolves false (opening nothing) when refused. */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (!isAllowedExternalUrl(url)) return false;
  await Linking.openURL(url);
  return true;
}
