import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The GCM authentication tag length must be PINNED to 16 bytes on both the
 * cipher and the decipher. Without `authTagLength`, Node accepts a truncated
 * tag (down to 4 bytes) on decrypt, cutting forgery work from 2^128 to as
 * little as 2^32 for anyone who can write rows. Semgrep rule:
 * javascript.node-crypto.security.gcm-no-tag-length.
 *
 * This asserts the option itself (spying on node:crypto), because no
 * black-box envelope can show the difference with the current fixed-offset
 * parser — see the note in pg.test.ts.
 */
const calls = vi.hoisted(() => ({ cipher: [] as unknown[][], decipher: [] as unknown[][] }));
vi.mock("node:crypto", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:crypto")>();
  return {
    ...real,
    createCipheriv: (...args: Parameters<typeof real.createCipheriv>) => {
      calls.cipher.push(args);
      return real.createCipheriv(...args);
    },
    createDecipheriv: (...args: Parameters<typeof real.createDecipheriv>) => {
      calls.decipher.push(args);
      return real.createDecipheriv(...args);
    }
  };
});

const { openValue, sealValue } = await import("./pg");
const originalKey = process.env.STORAGE_ENCRYPTION_KEY;
const originalPrevious = process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;

afterEach(() => {
  if (originalKey === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
  else process.env.STORAGE_ENCRYPTION_KEY = originalKey;
  if (originalPrevious === undefined) delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
  else process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = originalPrevious;
  calls.cipher.length = 0;
  calls.decipher.length = 0;
});

describe("keyring order on open", () => {
  it("tries the key named by kid first; without a kid it walks the ring primary-first", () => {
    const oldKey = "ab".repeat(32);
    const newKey = "cd".repeat(32);
    process.env.STORAGE_ENCRYPTION_KEY = oldKey;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    const sealed = sealValue({ accessToken: "x" });

    // Rotate: the sealing key is now only a previous key.
    process.env.STORAGE_ENCRYPTION_KEY = newKey;
    process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = oldKey;

    calls.decipher.length = 0;
    expect(openValue(sealed)).toEqual({ accessToken: "x" });
    expect(calls.decipher.map((args) => args[1])).toEqual([Buffer.from(oldKey, "hex")]);

    calls.decipher.length = 0;
    expect(openValue({ enc: sealed.enc })).toEqual({ accessToken: "x" });
    expect(calls.decipher.map((args) => args[1])).toEqual([Buffer.from(newKey, "hex"), Buffer.from(oldKey, "hex")]);
  });
});

describe("AES-256-GCM tag length is pinned", () => {
  it("seal and open both pass authTagLength: 16", () => {
    process.env.STORAGE_ENCRYPTION_KEY = "ab".repeat(32);
    const sealed = sealValue({ accessToken: "x" });
    expect(openValue(sealed)).toEqual({ accessToken: "x" });

    expect(calls.cipher).toHaveLength(1);
    expect(calls.cipher[0]?.[0]).toBe("aes-256-gcm");
    expect(calls.cipher[0]?.[3]).toEqual({ authTagLength: 16 });

    expect(calls.decipher.length).toBeGreaterThanOrEqual(1);
    for (const args of calls.decipher) {
      expect(args[0]).toBe("aes-256-gcm");
      expect(args[3]).toEqual({ authTagLength: 16 });
    }
  });
});
