// Theme bootstrap. The paper theme is the DEFAULT: the design (the Ledger
// Book preview) is paper-only, and the delivery plan's W2 spec reads "light
// default + dark 'ledger at 11pm'". Dark is an explicit choice made with the
// nav toggle and remembered per browser; the OS dark preference alone never
// switches it, so first paint always matches the design.
//
// THEME_SCRIPT runs inline in <body> before hydration (layout.tsx) so neither
// theme flashes. It also arms html.js, which gates ALL CSS-driven entrance
// choreography (no-JS visitors get the finished page, never a hidden one).
// The CSP allows it by its hash: each built page names the hashes of its own
// inline scripts (scripts/csp-script-hashes.mjs, P4.3), so editing this string
// needs nothing more than a rebuild.

export const THEME_STORAGE_KEY = "zeno-theme";

export const THEME_SCRIPT = `document.documentElement.classList.add("js");try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark");}catch(e){}`;
