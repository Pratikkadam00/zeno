// W7.4: a TLS front for the e2e server, for WebKit only. The site's policy
// carries `upgrade-insecure-requests`; Chrome and Firefox exempt 127.0.0.1
// from it, WebKit does not (measured 2026-10-09: every font and script was
// re-requested as https://127.0.0.1:3100 and failed). So the WebKit project
// talks to this https server, which forwards to `next start` unchanged. The
// certificate is self-signed, made fresh with openssl each run, and the
// WebKit project ignores certificate errors for it. Nothing here is used by
// the site or by CI outside the test run.
//
//   node e2e/tls-proxy.mjs <listen port> <upstream port>

import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LISTEN = Number(process.argv[2] ?? 3101);
const UPSTREAM = Number(process.argv[3] ?? 3100);

const dir = mkdtempSync(join(tmpdir(), "zeno-e2e-tls-"));
const key = join(dir, "key.pem");
const cert = join(dir, "cert.pem");
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-subj", "/CN=127.0.0.1", "-days", "2", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore" });

createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
  const upstream = httpRequest(
    { host: "127.0.0.1", port: UPSTREAM, method: req.method, path: req.url, headers: { ...req.headers, host: `127.0.0.1:${UPSTREAM}` } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on("error", () => {
    res.writeHead(502);
    res.end("upstream unavailable");
  });
  req.pipe(upstream);
}).listen(LISTEN, "127.0.0.1", () => {
  console.log(`tls-proxy: https://127.0.0.1:${LISTEN} -> http://127.0.0.1:${UPSTREAM}`);
});
