// Theme bootstrap. The paper theme is the DEFAULT: the design (the Ledger
// Book preview) is paper-only, and the delivery plan's W2 spec reads "light
// default + dark 'ledger at 11pm'". Dark is an explicit choice made with the
// nav toggle and remembered per browser; the OS dark preference alone never
// switches it, so first paint always matches the design.
//
// THEME_SCRIPT runs inline in <body> before hydration (layout.tsx) so neither
// theme flashes. It also arms html.js, which gates ALL CSS-driven entrance
// choreography (no-JS visitors get the finished page, never a hidden one).
// Inline script is allowed by the CSP ('unsafe-inline' on script-src is
// already required by Next's own hydration inlines).

export const THEME_STORAGE_KEY = "zeno-theme";

export const THEME_SCRIPT = `document.documentElement.classList.add("js");try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark");}catch(e){}`;
