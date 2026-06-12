import { randomUUID } from "node:crypto";

export type MagicLinkRequestResult = {
  delivered: true;
  channel: "dev_log";
  expiresInSeconds: number;
};

export type AuthSession = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tokenType: "Bearer";
};

export function createDevAuthAdapter() {
  const issuedCodes = new Map<string, string>();

  return {
    async requestMagicLink(email: string): Promise<MagicLinkRequestResult> {
      issuedCodes.set(email.toLowerCase(), "000000");
      return {
        delivered: true,
        channel: "dev_log",
        expiresInSeconds: 600
      };
    },
    async verifyMagicLink(email: string, code: string): Promise<AuthSession | null> {
      const expected = issuedCodes.get(email.toLowerCase());
      if (!expected || expected !== code) {
        return null;
      }

      issuedCodes.delete(email.toLowerCase());
      return {
        accountId: "acct_dev",
        accessToken: `dev.${Buffer.from(email).toString("base64url")}.access`,
        refreshToken: `dev.${randomUUID()}.refresh`,
        expiresInSeconds: 900,
        tokenType: "Bearer"
      };
    }
  };
}
