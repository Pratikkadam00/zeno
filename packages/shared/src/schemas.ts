import { z } from "zod";

// The request schemas the API shares from this package: /sync/pull and /sync/push
// (apps/api/src/app.ts). Every limit is pinned at its edge in schemas.test.ts.
// Six more schemas once lived here (money, theme, service record, subscription and
// two sign-in ones); nothing used them, and the sign-in pair was a weaker copy of
// the API's own (no 254-character email cap), so they were removed (P6.1, F205).

export const syncPullSchema = z.object({
  cursor: z.string().max(64).optional(),
  // coerce: query-string values arrive as strings, so z.number() would reject any
  // supplied limit (the cap was effectively unreachable before).
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const syncPushSchema = z.object({
  // Bounded to prevent memory-exhaustion DoS: server stores these blobs per user.
  encryptedChanges: z.array(z.object({
    entityType: z.enum(["subscription", "preference", "profile"]),
    entityId: z.string().min(1).max(128),
    operation: z.enum(["create", "update", "delete"]),
    encryptedPayload: z.string().max(8192),
    // Values are bounded as well as count: an unbounded magnitude let a client
    // pin an entity at a near-infinite version that legitimate later writes could
    // never overtake under last-write-wins (a self-scoped data-integrity DoS).
    vectorClock: z.record(z.string().max(64), z.number().int().min(0).max(2 ** 40))
      .refine((clock) => Object.keys(clock).length <= 64, { message: "vectorClock has too many entries" })
  })).max(100)
});
