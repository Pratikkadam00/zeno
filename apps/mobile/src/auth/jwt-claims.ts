// Reads the `email` claim of an access token the API just issued, so a
// magic-link sign-in can check it is the account the user asked for (P3.5).
// It does NOT verify the signature: the token came over TLS from our own API
// in answer to our own request, and the API verifies it on every use. Pure
// TypeScript on purpose: atob/TextDecoder support varies across Hermes
// versions, and a decoding gap here would lock real users out.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function base64UrlToBytes(input: string): number[] | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of input.replace(/=+$/, "")) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

// UTF-8 to a string; null on any malformed sequence (never a guess).
function utf8Decode(bytes: number[]): string | null {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i]!;
    const length = b0 < 0x80 ? 1 : b0 >> 5 === 0b110 ? 2 : b0 >> 4 === 0b1110 ? 3 : b0 >> 3 === 0b11110 ? 4 : 0;
    if (length === 0 || i + length > bytes.length) return null;
    let code = length === 1 ? b0 : b0 & (0xff >> (length + 1));
    for (let k = 1; k < length; k += 1) {
      const next = bytes[i + k]!;
      if (next >> 6 !== 0b10) return null;
      code = (code << 6) | (next & 0x3f);
    }
    // String.fromCodePoint throws above U+10FFFF; a 4-byte sequence can encode more.
    if (code > 0x10ffff) return null;
    out += String.fromCodePoint(code);
    i += length;
  }
  return out;
}

/** The token's `email` claim, or null when it has none or isn't a readable JWT. */
export function emailClaim(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const bytes = base64UrlToBytes(parts[1]!);
  const json = bytes === null ? null : utf8Decode(bytes);
  if (json === null) return null;
  try {
    const payload = JSON.parse(json) as { email?: unknown } | null;
    return payload !== null && typeof payload === "object" && typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}
