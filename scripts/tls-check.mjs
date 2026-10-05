// TLS check (P7.2, ASVS V12.1, V12.2): connects to the website and the API with
// each TLS version on its own and prints whether the SERVER accepts it, with the
// cipher and the certificate issuer. Then, on TLS 1.2, offers one family of
// cipher suites at a time: the ones without forward secrecy (plain RSA key
// exchange) and the ones without AEAD (CBC) should all be refused. The client's
// own floor is lowered (SECLEVEL=0) so a refusal is the server's, not Node's.
//   node scripts/tls-check.mjs
import tls from "node:tls";
const probe = (host, version, ciphers = "DEFAULT@SECLEVEL=0") => new Promise((res) => {
  const s = tls.connect({ host, port: 443, servername: host, minVersion: version, maxVersion: version, rejectUnauthorized: true, ciphers }, () => {
    const c = s.getPeerCertificate(); res(`accepted (${s.getCipher().name}; issuer ${c.issuer?.O ?? "?"} ${c.issuer?.CN ?? ""})`); s.end();
  });
  s.on("error", (e) => res(`refused (${e.code ?? e.message.slice(0, 40)})`));
  s.setTimeout(20000, () => { res("timeout"); s.destroy(); });
});
const FAMILIES = {
  "ECDHE + AEAD (wanted)": "ECDHE+AESGCM:ECDHE+CHACHA20",
  "RSA key exchange, no forward secrecy": "kRSA@SECLEVEL=0",
  "CBC (not AEAD), any key exchange": "AES128-SHA:AES256-SHA:AES128-SHA256:AES256-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA:ECDHE-ECDSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384@SECLEVEL=0",
  // Node 24's OpenSSL has these compiled out, so a refusal here is the CLIENT's:
  // informative only.
  "3DES, RC4, NULL, export": "3DES:RC4:eNULL:EXP@SECLEVEL=0"
};
for (const host of ["zenoapp.in", "zeno-api-5dwv.onrender.com"]) {
  for (const v of ["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"]) console.log(`${host} ${v}: ${await probe(host, v)}`);
  for (const [name, ciphers] of Object.entries(FAMILIES)) console.log(`${host} TLSv1.2 ${name}: ${await probe(host, "TLSv1.2", ciphers)}`);
}
