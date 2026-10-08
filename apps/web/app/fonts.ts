import localFont from "next/font/local";

// display "optional" (W6, 2026-10-09): every face is preloaded and small, so it
// is almost always there for the first paint; when it is not (a slow first
// visit), the size-adjusted fallback stays for that page view and nothing
// shifts. With "swap", CI measured CLS 0.107 on the privacy page under the
// mobile profile (budget 0.1): a long page re-laid out when the fonts arrived.

/**
 * The Honest Ledger type trio, self-hosted (F103).
 *
 * `next/font/google` downloaded these from Google Fonts at BUILD time, the
 * site build's only network step, and that download failed on CI now and then.
 * These are the same 13 woff2 files it served (copied from that build's output,
 * byte for byte), with the same unicode-range split and the same weights, so the
 * site renders as before and the build needs no network. All three families are
 * SIL Open Font License 1.1; each folder carries its OFL.txt.
 *
 * Each family is one variable font split by character range. One call per range
 * (next/font takes one unicode-range per call). The Latin call names the family:
 * next/font names it after the const (`spaceGrotesk`; Turbopack builds the CSS
 * variable from that name, so it must not be overridden). The other ranges join
 * it by declaring that same name. Only the Latin call is preloaded, sets the CSS
 * variable and generates the size-adjusted Arial fallback, as before; the other
 * ranges load only when a page uses a character in them. next/font needs literal
 * options, hence the repetition.
 */
export const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk/latin.woff2",
  weight: "500 700",
  variable: "--font-display",
  display: "optional",
  declarations: [
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }
  ]
});
const displayLatinExt = localFont({
  src: "./fonts/space-grotesk/latin-ext.woff2",
  weight: "500 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "spaceGrotesk" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" }
  ]
});
const displayVietnamese = localFont({
  src: "./fonts/space-grotesk/vietnamese.woff2",
  weight: "500 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "spaceGrotesk" },
    { prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }
  ]
});

export const hankenGrotesk = localFont({
  src: "./fonts/hanken-grotesk/latin.woff2",
  weight: "400 700",
  variable: "--font-body",
  display: "optional",
  declarations: [
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }
  ]
});
const bodyLatinExt = localFont({
  src: "./fonts/hanken-grotesk/latin-ext.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "hankenGrotesk" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" }
  ]
});
const bodyVietnamese = localFont({
  src: "./fonts/hanken-grotesk/vietnamese.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "hankenGrotesk" },
    { prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }
  ]
});
const bodyCyrillicExt = localFont({
  src: "./fonts/hanken-grotesk/cyrillic-ext.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "hankenGrotesk" },
    { prop: "unicode-range", value: "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F" }
  ]
});

export const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono/latin.woff2",
  weight: "400 700",
  variable: "--font-mono",
  display: "optional",
  declarations: [
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }
  ]
});
const monoLatinExt = localFont({
  src: "./fonts/jetbrains-mono/latin-ext.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "jetbrainsMono" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" }
  ]
});
const monoVietnamese = localFont({
  src: "./fonts/jetbrains-mono/vietnamese.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "jetbrainsMono" },
    { prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" }
  ]
});
const monoCyrillicExt = localFont({
  src: "./fonts/jetbrains-mono/cyrillic-ext.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "jetbrainsMono" },
    { prop: "unicode-range", value: "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F" }
  ]
});
const monoCyrillic = localFont({
  src: "./fonts/jetbrains-mono/cyrillic.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "jetbrainsMono" },
    { prop: "unicode-range", value: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" }
  ]
});
const monoGreek = localFont({
  src: "./fonts/jetbrains-mono/greek.woff2",
  weight: "400 700",
  display: "optional",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "jetbrainsMono" },
    { prop: "unicode-range", value: "U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF" }
  ]
});

/** The three CSS variables, set on the root element. */
export const fontClassNames = `${spaceGrotesk.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`;

/**
 * The extra ranges declare no variable: each only adds its @font-face to the
 * family. Exported so none is dropped as unused.
 */
export const extraRanges = [displayLatinExt, displayVietnamese, bodyLatinExt, bodyVietnamese, bodyCyrillicExt, monoLatinExt, monoVietnamese, monoCyrillicExt, monoCyrillic, monoGreek];
