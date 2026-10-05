import { describe, expect, it } from "vitest";
import { extractStoreAppName } from "./email-receipts";

describe("extractStoreAppName", () => {
  it("names the app on the '(Monthly)' line, never words from the line above", () => {
    expect(extractStoreAppName("App Store receipt\nNetflix (Monthly) $15.49")).toBe("Netflix");
    expect(extractStoreAppName("Receipt\r\nOrder ID MXYZ\r\nDuolingo Super (1 Year) $83.99")).toBe("Duolingo Super");
  });

  it("strips a leading heading on a single flattened line (HTML receipts are one line)", () => {
    expect(extractStoreAppName("App Store receipt Netflix (Monthly) $15.49")).toBe("Netflix");
    expect(extractStoreAppName("Your receipt from Apple Disney+ (Monthly) $13.99")).toBe("Disney+");
  });

  it("reads 'X subscription' and 'renewal for X' forms", () => {
    expect(extractStoreAppName("Your Headspace subscription renewed for $12.99")).toBe("Headspace");
    expect(extractStoreAppName("Google Play renewal for Zzqxgram Pro $3.99")).toBe("Zzqxgram Pro");
  });

  it("returns null when no app name can be read", () => {
    expect(extractStoreAppName("App Store: your subscription renewed. $4.99")).toBeNull();
    expect(extractStoreAppName("Google Play order receipt $2.99")).toBeNull();
    expect(extractStoreAppName("")).toBeNull();
  });

  // P6.1 (F206): each case below failed to notice a mutation Stryker made.
  it("takes up to three words before the period marker, and the marker may follow with no space", () => {
    expect(extractStoreAppName("Lumo Sleep Plus (Monthly)")).toBe("Lumo Sleep Plus");
    expect(extractStoreAppName("Calm(Annual) $69.99")).toBe("Calm");
    expect(extractStoreAppName("Calm (Yearly)")).toBe("Calm");
    expect(extractStoreAppName("Calm (1 Month)")).toBe("Calm");
    expect(extractStoreAppName("Calm (Auto-Renewable)")).toBe("Calm");
  });

  it("folds runs of spaces and tabs inside the name to one space", () => {
    expect(extractStoreAppName("Bear  Notes (Monthly)")).toBe("Bear Notes");
    expect(extractStoreAppName("Bear\tNotes (Monthly)")).toBe("Bear Notes");
  });

  it("peels every leading noise word, App Store and Google Play written with or without a space", () => {
    expect(extractStoreAppName("Appstore Netflix (Monthly)")).toBe("Netflix");
    expect(extractStoreAppName("App Store Netflix (Monthly)")).toBe("Netflix");
    expect(extractStoreAppName("GooglePlay Netflix (Monthly)")).toBe("Netflix");
    expect(extractStoreAppName("Google Play Netflix (Monthly)")).toBe("Netflix");
    expect(extractStoreAppName("renewal for the your Netflix")).toBe("Netflix");
  });

  it("peels noise only from the front: a noise word inside the name stays", () => {
    expect(extractStoreAppName("Calm For Kids (Monthly)")).toBe("Calm For Kids");
  });

  it("peels the auto-renew heading however it is written", () => {
    expect(extractStoreAppName("Auto-Renew Calm (Monthly)")).toBe("Calm");
    expect(extractStoreAppName("Autorenewing Calm (Monthly)")).toBe("Calm");
    expect(extractStoreAppName("Auto renewable Calm (Monthly)")).toBe("Calm");
  });

  it("reads the forms in any letter case", () => {
    expect(extractStoreAppName("Calm SUBSCRIPTION renewed")).toBe("Calm");
    expect(extractStoreAppName("RECEIPT FOR Calm")).toBe("Calm");
    expect(extractStoreAppName("Calm (MONTHLY)")).toBe("Calm");
  });

  it("finds no name when the words it read are all noise", () => {
    expect(extractStoreAppName("subscription to order item the")).toBeNull();
  });

  it("needs a name of at least two characters at each step, else tries the next", () => {
    // One letter before "(Monthly)": too short, so the "X subscription" form is used.
    expect(extractStoreAppName("Q (Monthly) Calm subscription")).toBe("Calm");
    // Two letters is enough.
    expect(extractStoreAppName("Qi (Monthly)")).toBe("Qi");
    expect(extractStoreAppName("Qi subscription")).toBe("Qi");
    expect(extractStoreAppName("receipt for Qi")).toBe("Qi");
    expect(extractStoreAppName("receipt for Q")).toBeNull();
  });

  it("reads 'receipt for X' and 'subscription to X' as well", () => {
    expect(extractStoreAppName("Your receipt for Calm Premium")).toBe("Calm Premium");
    expect(extractStoreAppName("Thanks for your subscription to Calm")).toBe("Calm");
  });
});
