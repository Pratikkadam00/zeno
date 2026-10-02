# The domain, checked 2026-10-01

## What zeno.app serves today

```
curl -s -D - https://zeno.app
HTTP/1.1 200 OK · Content-Length: 114
<!DOCTYPE html><html><head><script>window.onload=function(){window.location.href="/lander"}</script></head></html>

curl -s -D - https://zeno.app/lander
HTTP/1.1 307 Temporary Redirect
Location: https://forsale.godaddy.com/forsale/zeno.app?utm_source=TDFS_BINNS2&utm_medium=parkedpages...
Set-Cookie: ... Domain=afternic.com
```

zeno.app is a GoDaddy/Afternic **"for sale" parking page**. RDAP (rdap.org, followed to the .app registry) says the name is registered, status `active`, expires 2027-09-23. Unless the owner is the one who listed it for sale, Zeno does not own zeno.app.

## Candidate names checked by RDAP the same way

| Domain | RDAP | Note |
|---|---|---|
| zeno.app | registered, expires 2027-09-23 | parked for sale (above) |
| getzeno.app | registered, expires 2027-01-12 | taken |
| zenoapp.com | registered 2015, expires 2027-07-05 | taken |
| usezeno.com | registered 2025-10-30 | taken |
| zeno.money | registered | taken |
| zenoledger.com | registered 2024 | taken |
| tryzeno.app | registered | taken |
| honestledger.app | registered | taken |
| zeno.finance | registered | taken |
| **zenosubs.com** | 404 = no record | likely available (confirm at a registrar) |
| **zenoledger.app** | 404 = no record | likely available |
| **zenoapp.io** | 404 = no record | likely available |

"Zeno" is a crowded name (a philosopher, a Dutch bank, several apps). The brand SERP "zeno app" will be contested whatever the domain. That is a reason to pick a domain that carries the category word (e.g. a `-subs`/`-ledger` suffix) so the exact-match brand query is at least unambiguous.

## What changes when the domain is chosen

Only one value: `NEXT_PUBLIC_SITE_URL` in the web deploy environment (read by `apps/web/lib/site.ts`; a guard test fails the build if the host is spelled out anywhere else). The mobile app's legal links read `apps/mobile/src/config/site.ts` the same way (engineering session's file; add it to `docs/OPEN_ITEMS.md`). `privacy@` and `legal@` mailboxes derive from the host, so the mailboxes must exist at the chosen domain before launch (COMPLIANCE.md §5 names `privacy@zeno.app` as the request channel).
