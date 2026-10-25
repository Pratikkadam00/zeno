# The AI spend coach: Claude, scoped and capped (F247, 2026-10-25)

The coach turns a person's subscription list into a short summary and up to five
suggestions. It runs on Claude through Anthropic's official SDK. This page is how it
is kept to that one job, how it is kept from spending more than the owner set, and
what the owner does to turn it on.

## The model: Claude Sonnet 5.5

`claude-sonnet-5-5`, at low effort. The owner asked about "Sonnet 5". Sonnet 5.5 is
the current Sonnet at the same price as Sonnet 5, so there is no reason to use the
older one.

| Model | Input, per million tokens | Output, per million tokens | Why or why not |
|---|---:|---:|---|
| **Claude Sonnet 5.5 (chosen)** | $2 | $10 | A short, fully specified task in a fixed shape. Sonnet handles it, and it holds a charter under pressure better than a small model. |
| Claude Haiku 5.5 | $0.10 | $0.50 | About twenty times cheaper. Worth trying once the red-team test below has run on it; switch with `AI_COACH_MODEL=claude-haiku-5-5`. |
| Claude Opus 5.5 | $4 | $20 | Twice Sonnet's price for a task that does not need it. |
| Claude Opus 4.8 (the old default) | $5 | $25 | Replaced. |

Prices as listed by Anthropic on 2026-10-25. Estimated cost per answer on Sonnet 5.5:
about 2,500 tokens in and up to a few hundred out, roughly **$0.01 to $0.02**. The
red-team run prints the measured figure; this page is updated with it after the first
run.

## Six layers, each assuming the one before it failed

1. **Only data goes in.** The request schema is strict (an unknown field is a 400, not
   dropped). There is no free-text question: the app never sent one, and it was the
   widest door for "write me Python code". Category and billing cycle are the app's own
   fixed lists. The only free text left is the person's subscription names (80
   characters each) and the app's insight lines. Line breaks and control characters
   are flattened, and the data sits inside a fence the model is told is data.
2. **A charter as the system prompt** (`apps/api/src/ai-coach-constitution.md`): one
   job, a list of what it refuses (code, general knowledge, advice it may not give,
   revealing its instructions, links, markup), and rules no request can override.
3. **The answer's shape is enforced by the API** (structured outputs): the model can
   only return `{outOfScope, summary, recommendations[]}`. No prose around it, no
   markdown, no extra fields.
4. **A refusal is not retried.** When Claude's own safety checks decline, the coach
   shows its fixed redirect. No fallback to another model is requested: a request this
   model declines is not one the app wants answered elsewhere, at another price.
5. **Every field is screened before it reaches the screen** (`coach-guard.ts`).
   Anything that looks like code, a command, a link, markup, or the charter's own
   wording replaces the whole answer with a fixed redirect written in the code, not by
   the model. A person's own subscription name excuses a bare domain it contains
   (Copy.ai, Chess.com Premium, MLB.TV) and nothing else: a name like "e" or "."
   cannot weaken any other check. Tests pin both what it catches and the ordinary
   sentences it leaves alone, and mutation testing found two holes before release
   (an arrow function pattern that missed `(a)=>(`, and that name rule).
6. **Money is capped before each call** (`coach-budget.ts`). See below.

## The caps

The owner's Anthropic account limit ($100 a month) is the outer wall. When it is hit,
Anthropic refuses every call until the month turns. The app's own caps sit inside it,
so the coach stops cleanly before that wall and no day or account can use the month up.

| Cap | Default | Setting on Render |
|---|---|---|
| All accounts, per calendar month (UTC) | $90 | `COACH_MONTHLY_BUDGET_USD` |
| All accounts, per day (UTC) | $6 | `COACH_DAILY_BUDGET_USD` |
| One account, per month | $0.50 | `COACH_ACCOUNT_MONTHLY_BUDGET_USD` |
| One account, fresh answers per day | 10 | `COACH_ACCOUNT_DAILY_REQUESTS` |
| One account, requests per minute | 10 | the route's rate limit |

How they hold:

- **Each call's worst case is reserved first.** That means its input estimated high
  and every one of its 2,048 output tokens. Calls running at the same moment therefore
  cannot overshoot a cap between them. Afterwards the real cost replaces the
  reservation, computed from the response's own token counts. A call that fails is
  charged its whole reservation, because it may still have been billed. The ledger
  never counts less than Anthropic does.
- **Spend is written to the database as it happens**, so a restart does not reset the
  month.
- **A mistyped setting falls back to the default**, never to "no limit".
- **Only priced models can be called.** A model missing from the price table is refused
  rather than spending money the ledger cannot count.
- **The same request from the same account within a day is answered from memory**, for
  free. The coach screen asks again on every visit.
- **A capped coach answers 429**, and the app shows its on-device insights instead. The
  response does not say which cap was hit.

## What the owner does

1. In the Anthropic Console, create a **workspace** for Zeno and set its **spend limit**
   (for example $100 a month). Create an **API key in that workspace**. A separate
   workspace keeps the coach's spend apart from anything else on the account.
2. On Render, set `ANTHROPIC_API_KEY` on zeno-api. The coach switches from Groq to
   Claude on the next deploy. Leave `COACH_PROVIDER` and `AI_COACH_MODEL` unset to get
   Sonnet 5.5.
3. Optional: lower or raise the caps with the four settings above.
4. Run the red-team test once with the key, from a terminal. It costs about $0.20:

   ```bash
   COACH_REDTEAM=1 ANTHROPIC_API_KEY=<the key> npx vitest run apps/api/src/coach.redteam.live.test.ts
   ```

   It sends ten attacks: asks for code, for Zeno's source, for the prompt, a fence
   break, false authority, an off-topic question, investment advice, SQL, a planted
   link, and an instruction hidden in an insight. It passes only if the model stays on
   its job **without** the guard having to rescue it, and it prints what the run cost.

## Not covered here

- **A paid entitlement for the coach.** Today any signed-in account can use it, within
  the caps above. Gating it to Pro is a product decision.
- **Prompt caching.** The system prompt is long enough to cache, but a cache write
  costs 1.25 times the normal input price and pays back only when another coach call
  arrives within five minutes. At launch traffic, caching would raise the bill. Revisit
  when traffic is steady.
