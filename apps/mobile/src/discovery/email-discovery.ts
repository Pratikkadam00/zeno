import { detectEmailReceiptCandidates, type EmailReceiptCandidate, type EmailReceiptCandidateInput } from "@subradar/shared";

export type EmailProviderConnection = {
  provider: EmailReceiptCandidateInput["provider"];
  connected: boolean;
  tokenStorage: "secure_store";
  parsingLocation: "on_device";
};

export const supportedEmailConnections: EmailProviderConnection[] = [
  { provider: "gmail", connected: false, tokenStorage: "secure_store", parsingLocation: "on_device" },
  { provider: "outlook", connected: false, tokenStorage: "secure_store", parsingLocation: "on_device" },
  { provider: "apple_mail", connected: false, tokenStorage: "secure_store", parsingLocation: "on_device" },
  { provider: "yahoo", connected: false, tokenStorage: "secure_store", parsingLocation: "on_device" },
  { provider: "protonmail", connected: false, tokenStorage: "secure_store", parsingLocation: "on_device" }
];

export function runLocalEmailReceiptDemo(): EmailReceiptCandidate[] {
  return detectEmailReceiptCandidates([
    {
      provider: "gmail",
      sender: "Adobe <message@adobe.com>",
      subject: "Your Adobe Creative Cloud renewal receipt for $54.99",
      snippet: "Your monthly subscription has renewed.",
      receivedAt: "2026-05-24T09:00:00.000Z"
    },
    {
      provider: "gmail",
      sender: "OpenAI <noreply@tm.openai.com>",
      subject: "Your ChatGPT Plus subscription receipt for $20.00",
      snippet: "Monthly plan payment confirmation.",
      receivedAt: "2026-05-23T09:00:00.000Z"
    },
    {
      provider: "outlook",
      sender: "Newsletter <hello@example.com>",
      subject: "Weekly design links",
      snippet: "No payment language here.",
      receivedAt: "2026-05-22T09:00:00.000Z"
    }
  ]);
}
