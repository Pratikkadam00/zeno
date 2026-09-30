// Extensionless on purpose, matching packages/shared (finding F22). The old
// `"./services.js"` made every bundler that resolves this package from SOURCE
// (Next/Turbopack via tsconfig paths, Metro, Vite) load a stale, hand-regenerated
// src/services.js instead of services.ts: a catalog edit in services.ts never
// reached the website or the app until someone rebuilt that file. The compiled
// dist keeps the same extensionless form, which the API already loads for
// @zeno/shared under tsx in production.
export * from "./services";
