import { z } from "zod";

export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "CAD", "AUD"])
});

export const themePreferenceSchema = z.enum(["genz", "millennial", "genx"]);

export const serviceRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
  slug: z.string(),
  name: z.string(),
  website: z.string().url(),
  logoUrl: z.string().url().optional(),
  category: z.enum([
    "ai_tools",
    "entertainment",
    "productivity",
    "health",
    "finance",
    "education",
    "developer_tools",
    "family",
    "other"
  ]),
  defaultMonthlyPrice: moneySchema.optional(),
  defaultAnnualPrice: moneySchema.optional(),
  cancellationUrl: z.string().url().optional(),
  cancellationDifficulty: z.enum(["easy", "medium", "hard", "dark_pattern"]),
  cancellationGuideSteps: z.array(z.string()),
  freeTrialDays: z.number().int().optional(),
  supportContact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    chatUrl: z.string().url().optional()
  }).optional()
});

export const subscriptionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
  serviceId: z.string().optional(),
  serviceSlug: z.string().optional(),
  name: z.string().min(1),
  category: serviceRecordSchema.shape.category,
  price: moneySchema,
  billingCycle: z.enum(["weekly", "monthly", "quarterly", "annual", "trial", "unknown"]),
  nextRenewalDate: z.string().optional(),
  lastChargedDate: z.string().optional(),
  status: z.enum(["active", "cancelled", "paused", "trial", "unknown"]),
  ownerProfileId: z.string(),
  valueRating: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().optional(),
  mutedUntil: z.string().optional(),
  source: z.enum(["manual", "csv", "email", "open_banking", "seed"])
});

export const magicLinkRequestSchema = z.object({
  email: z.string().email()
});

export const magicLinkVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(12)
});

export const syncPullSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50)
});

export const syncPushSchema = z.object({
  encryptedChanges: z.array(z.object({
    entityType: z.enum(["subscription", "preference", "profile"]),
    entityId: z.string(),
    operation: z.enum(["create", "update", "delete"]),
    encryptedPayload: z.string(),
    vectorClock: z.record(z.string(), z.number().int())
  })).max(100)
});
