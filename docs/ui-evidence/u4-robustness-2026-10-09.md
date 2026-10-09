# U4 · Robustness: conditions real people hit

**Date:** 2026-10-09 · **Device:** emulator-5554 (Android 16). The gate asks that each
condition be run on the emulator with its result and evidence.

A note on what this build talks to. It was compiled without `PUBLIC_API_BASE_URL`, so its
API base is `http://127.0.0.1:8787` **on the device**. Nothing here could reach production
even by accident, which is why the sign-in conditions could be driven freely.

**Two findings, both fixed:**

| # | Finding | State |
|---|---|---|
| F238 | The app and the website defaulted to `https://zeno.app` — a domain Zeno does not own, parked and for sale. Tapping Terms on the device opened a GoDaddy sale listing | fixed |
| F239 | A failed request showed the platform's raw exception on the sign-in screen: "fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy" | fixed |

---

## F238 · the app pointed its legal links at a stranger's domain

Found by accident, which is the honest account: while trying to reach the sign-in screen a
tap landed on **Terms**, and a browser opened on *"The domain name zeno.app is for sale —
Buy now for $12,888 | GoDaddy"*.

The cause is a default. Both sources of truth carried
`DEFAULT_SITE_URL = "https://zeno.app"`, used whenever the deploy's environment variable is
absent. The live website sets `NEXT_PUBLIC_SITE_URL`, so **zenoapp.in has always been
correct in production** — but any build that forgot the variable, including every release
APK built on this machine today, shipped a stranger's parked page as:

- the Terms and Privacy links, which are exactly what a store review opens;
- the share signature appended to everything a user shares;
- the `privacy@`, `legal@` and `feedback@` addresses, which derive from the host;
- and, on the web side, every canonical URL, sitemap entry and share card.

The API had the same error in its dev-default sender, `Zeno <login@zeno.app>` — a domain
Resend has not verified, so mail sent with it would be rejected outright.

**Fixed** by making both defaults, and the API's sender, the real `zenoapp.in`, so a
missing variable now degrades to *correct* rather than to someone else's property.

The guard that was supposed to prevent exactly this,
`scripts/site-url-guard.test.ts`, was policing `/zeno\.app/i` — the wrong host — so it had
been watching the wrong door. Pointed at the real host, it immediately caught a hardcoded
`zenoapp.in/cancel` in the website's FAQ copy, now routed through `SITE_HOST`.

**Proof on the device:** after the fix, tapping Terms opens Chrome with
`zenoapp.in/legal/terms` in the address bar and Zeno's own Terms of Service on the page.

## F239 · a Java exception shown to the user

With the API unreachable, the sign-in screen read:

```
fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to
127.0.0.1 not permitted by network security policy
```

Every screen renders `error.message`, which is right for an API error, because the server's
envelope carries a message written for a person. It is wrong for a transport failure, where
the message is whatever the platform threw. On a real phone this surfaces as DNS, TLS and
socket exception text whenever the network is poor.

**Fixed** at the one place that knows nothing was reached: `timedFetch` now wraps a
transport failure in a `NetworkError` whose message is a sentence ("Could not reach Zeno.
Check your connection and try again.", or "That took too long…" for its own timeout),
keeping the platform's error as `cause` for the log and the crash report. Every caller
benefits, because they all go through it. A caller that aborts with its own signal is not
reported as a timeout.

`http.test.ts` pins it: the Android cleartext exception becomes the sentence, the original
survives as `cause`, and the message is asserted to contain no `java.`, no `Exception`, no
`CLEARTEXT`, no stack frame. **On the device** the same flow now reads
"Could not reach Zeno. Check your connection and try again."

---

## The conditions

| # | Condition | Result |
|---|---|---|
| U4.1 | **No network at all** | **Pass.** Airplane on, ping unreachable. The ledger opens with its figures; a subscription can be **added** and, after a force-stop and cold start, is still there — so it was really written, not held in memory. No crash. |
| U4.2 | **2G link** (`emu network speed gsm`, `delay gprs`) | **Pass.** Opens, the ledger reads normally, nothing stuck on a spinner. |
| U4.3 | **API down; API answering garbage** | **Down: pass** (and it produced F239). Nothing listening: the screen now says a sentence and the user is not let in. **Garbage: not reachable on a release build** — `usesCleartextTraffic="false"` means Android blocks a plain-HTTP API before the request leaves the device, which is the correct posture and was itself the proof. A garbage server was stood up behind `adb reverse` and received **no** requests. The malformed-envelope paths are covered in `client.edges.test.ts` (a 2xx with `data: null`, an envelope with no `data`, each rejecting rather than resolving undefined). |
| U4.4 | **Network pulled mid sign-in** | **Pass.** Airplane enabled while the request was in flight: a written sentence, no crash, not signed in. |
| U4.5 | **Process death** (`am kill`, what the system does under pressure) | **Pass.** The process is gone (0 pids); on relaunch the ledger and its figures are intact. |
| U4.6 | **Clock and time zone changed** | **Pass, and precisely.** Across Asia/Calcutta → Pacific/Honolulu (UTC−10) → Pacific/Auckland (UTC+13), a 23-hour swing, the renewal stayed **Nov 8** while the header's "today" correctly followed the device (FRI OCT 9 → SAT OCT 10). With the clock pushed 40 days on, the renewal became **Dec 8** — the next occurrence, not a stale past date. |
| U4.9 | **Upgrade with data on the phone** | **Pass.** Nine successive `install -r` upgrades today over an existing database: the ledger survived each one, and all **38 visual baselines still match** afterwards — the same screens, pixel for pixel, across every upgrade. |
| U4.10 | **A notification arrives mid-flow** | **Pass.** A notification posted over the open app: Zeno stays in front, the screen is intact, no crash. |
| U4.12 | **Battery saver and low memory** | **Pass.** Under `low_power 1` the app opens and reads normally; after `TRIM_MEMORY_COMPLETE` while backgrounded it returns intact. |

**No FATAL exception** appeared in logcat across any of the above.

## Not done, and why

- **U4.7 language and number format.** Changing the emulator's locale needs a property
  write and a framework restart (`setprop persist.sys.locale; stop; start`), which
  reboots the device mid-session. The formatting itself is covered off-device: the six
  currencies are pinned in `format.behavior.test.ts` and rendered on a screen in
  `state-matrix.rntest.tsx` (U1.7), and dates are UTC-parsed and locale-formatted with
  tests run in Honolulu and Auckland offsets (P6). The on-device run is still owed.
- **U4.8 1,000 subscriptions.** Not reachable on the device: there is no way to inject a
  thousand rows, because the database is SQLCipher-encrypted and the only writer is the UI.
  200 are driven in jest (U1.3), where the ledger counts and totals all of them and the
  list virtualises. A device run needs a seeding hook that does not exist.
- **U4.11 almost out of storage.** Not run. Filling the emulator's data partition to the
  point where SQLite writes fail risks leaving the image unusable for the other work, and
  there is no supported knob for "fail the next write". The write path's failure handling
  is covered in `erase-device.test.ts` and the repository tests. Worth doing on a scratch
  AVD, which is an owner item alongside U2.3/U2.4.
