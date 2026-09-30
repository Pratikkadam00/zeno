/**
 * The API's LIVE route list, for suites that must cover every route (the
 * authorization matrix, the rate-limit table). Parsed from Fastify's printed
 * route tree, because an `onRoute` hook added after buildApp() sees nothing:
 * the routes are already registered by then.
 *
 * Children print relative to their parent, 4 characters deeper per level.
 * HEAD is Fastify's automatic twin of GET, and the catch-all `*` (OPTIONS) is
 * the CORS preflight; both are left out.
 */
export function routesFromTree(tree: string): string[] {
  const out: string[] = [];
  const stack: string[] = [];
  for (const line of tree.split("\n")) {
    const match = /^([\s│├└─]*)(\S.*?)(?: \(([A-Z, ]+)\))?$/.exec(line);
    if (!match || !match[2]) continue;
    const depth = Math.floor(match[1]!.length / 4);
    stack.length = depth;
    const full = `${stack[depth - 1] ?? ""}${match[2]}`;
    stack[depth] = full;
    for (const method of (match[3] ?? "").split(", ").filter(Boolean)) {
      if (method !== "HEAD" && full !== "*") out.push(`${method} ${full}`);
    }
  }
  return out;
}

/** A concrete URL for a route pattern (sample values for its params). */
export function concreteUrl(pattern: string): string {
  return pattern
    .replace(":slug", "netflix")
    .replace(":provider", "plaid")
    .replace(":householdId", "hh_inventory");
}
