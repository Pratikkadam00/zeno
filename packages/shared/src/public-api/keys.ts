export type PublicApiScope =
  | "subscriptions:read"
  | "subscriptions:write"
  | "services:read"
  | "analytics:read"
  | "webhooks:write";

export type PublicApiKey = {
  id: string;
  label: string;
  prefix: string;
  scopes: PublicApiScope[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type PublicApiKeyPreview = Omit<PublicApiKey, "prefix"> & {
  maskedKey: string;
};

export function createPublicApiKeyPreview(key: PublicApiKey): PublicApiKeyPreview {
  const preview: PublicApiKeyPreview = {
    id: key.id,
    label: key.label,
    scopes: key.scopes,
    createdAt: key.createdAt,
    maskedKey: `${key.prefix}_************************`
  };

  if (key.expiresAt) {
    preview.expiresAt = key.expiresAt;
  }
  if (key.revokedAt) {
    preview.revokedAt = key.revokedAt;
  }

  return preview;
}

export function canUseScope(key: PublicApiKey, scope: PublicApiScope, now = new Date()): boolean {
  if (key.revokedAt) {
    return false;
  }
  if (key.expiresAt && Date.parse(key.expiresAt) <= now.getTime()) {
    return false;
  }
  return key.scopes.includes(scope);
}
