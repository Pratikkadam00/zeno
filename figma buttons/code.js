const PAGE_NAME = "Zeno · Buttons";
const TOKEN_COLLECTION_NAME = "Zeno Tokens";
const NS = "zeno-buttons";

const MODE_NAMES = ["Web", "Pulse", "Clarity", "Command"];
const GENERATED_TEXT_STYLES = [
  "Button/Web",
  "Button/Web-Small",
  "Button/Mobile",
  "Pill/Mono"
];
const GENERATED_EFFECT_STYLES = [
  "Shadow/Primary",
  "Shadow/Primary-Hover",
  "Shadow/Pill-Active"
];

const MODE_TO_THEME = {
  Web: "Web",
  Pulse: "Pulse",
  Clarity: "Clarity",
  Command: "Command"
};

const THEME_MODE_FOR_LABEL = {
  Pulse: "Pulse",
  Clarity: "Clarity",
  Command: "Command"
};

(async function main() {
  try {
    const fonts = await resolveFonts();
    await removeGeneratedStyles();
    await removeGeneratedTokenCollection();

    const page = await resetPage();
    const tokens = createTokens();
    const styles = createStyles(fonts);

    page.backgrounds = [solidPaint("#07080C")];

    const title = createText("Zeno Buttons", fonts.displayBold, 44, "#EEF2F8", {
      lineHeight: 52
    });
    title.x = 80;
    title.y = 56;
    page.appendChild(title);

    const subtitle = createText(
      "Button component library generated from Zeno web and mobile source tokens.",
      fonts.webRegular,
      15,
      "#99A2B4",
      { lineHeight: 22 }
    );
    subtitle.x = 82;
    subtitle.y = 116;
    page.appendChild(subtitle);

    const fontNote = createText(fonts.note, fonts.monoBold, 10.5, "#7C869A", {
      lineHeight: 16,
      letterSpacing: 0.2
    });
    fontNote.x = 82;
    fontNote.y = 146;
    page.appendChild(fontNote);

    addSectionHeading(page, "Web Buttons", 220, fonts);
    const webButtonSet = createWebButtonSet(page, tokens, styles, fonts);
    positionWithCaption(
      page,
      webButtonSet,
      80,
      286,
      "Default 50 px, small 42 px - radius 13/11 - gradient primary + ghost surface",
      fonts
    );

    const ctaSet = createCtaSet(page, tokens, styles, fonts);
    positionWithCaption(
      page,
      ctaSet,
      860,
      286,
      "CTA 50 px - radius 13 - hover is lifted by 1 px",
      fonts
    );

    addSectionHeading(page, "Web Pills", 720, fonts);
    const toggleSet = createSegmentedToggleSet(page, tokens, styles, fonts);
    positionWithCaption(
      page,
      toggleSet,
      80,
      786,
      "Container padding 4 - gap 2 - radius 12 - active gradient",
      fonts
    );

    const pillSet = createWebPillSet(page, tokens, styles, fonts);
    positionWithCaption(
      page,
      pillSet,
      620,
      786,
      "Pill padding 9 x 18 - radius 9 - save sub-pill swaps on active",
      fonts
    );

    const tag = createTagComponent(page, "Tag", tokens, fonts);
    positionWithCaption(
      page,
      tag,
      80,
      1054,
      "Tag mono 10.5/700 uppercase - padding 4 x 10 - radius 999",
      fonts
    );

    const brand = createTagComponent(page, "Brand", tokens, fonts);
    positionWithCaption(
      page,
      brand,
      310,
      1054,
      "Brand mono 11/700 - padding 3 x 9 - radius 999",
      fonts
    );

    const iconSet = createIconButtonSet(page, tokens, fonts);
    positionWithCaption(
      page,
      iconSet,
      550,
      1054,
      "Icon button 42 x 42 - radius 11 - menu/close states",
      fonts
    );

    addSectionHeading(page, "Mobile Buttons", 1270, fonts);
    const primaryMobileSet = createMobileButtonSet(page, "PrimaryButton", tokens, fonts);
    positionWithCaption(
      page,
      primaryMobileSet,
      80,
      1336,
      "Theme x state - min height 48 - fill and radius bound to Zeno Tokens modes",
      fonts
    );

    const secondaryMobileSet = createMobileButtonSet(page, "SecondaryButton", tokens, fonts);
    positionWithCaption(
      page,
      secondaryMobileSet,
      760,
      1336,
      "Theme x state - surfaceAlt fill, primary text, radius bound to modes",
      fonts
    );

    const dangerSet = createDangerPillSet(page, tokens, fonts);
    positionWithCaption(
      page,
      dangerSet,
      80,
      1760,
      "Cancel pill - #EF4444 fill - padding 7 x 14 - radius 20",
      fonts
    );

    const textSet = createTextButtonSet(page, tokens, fonts);
    positionWithCaption(
      page,
      textSet,
      520,
      1760,
      "Undo text button - transparent fill - theme primary text",
      fonts
    );

    addSectionHeading(page, "More Controls", 2040, fonts);
    const themeToggleSet = createThemeToggleSet(page, tokens, fonts);
    positionWithCaption(
      page,
      themeToggleSet,
      80,
      2106,
      "Mobile 3-way theme switch - active segment uses theme primary",
      fonts
    );

    const featurePillSet = createFeaturePillSet(page, tokens, fonts);
    positionWithCaption(
      page,
      featurePillSet,
      80,
      2340,
      "Intelligence-suite chips - active (primarySurface) vs locked (warningSurface)",
      fonts
    );

    const rangeToggleSet = createRangeToggleSet(page, tokens, fonts);
    positionWithCaption(
      page,
      rangeToggleSet,
      620,
      2340,
      "Analytics range toggle - active rgba(91,140,255,0.16)",
      fonts
    );

    figma.viewport.scrollAndZoomIntoView([
      title,
      webButtonSet,
      ctaSet,
      toggleSet,
      primaryMobileSet
    ]);
    figma.closePlugin("Zeno buttons built");
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    figma.closePlugin("Zeno buttons failed: " + message);
  }
})();

async function resetPage() {
  const oldPages = figma.root.children.filter((page) => page.name === PAGE_NAME);
  const page = figma.createPage();
  page.name = PAGE_NAME;
  page.setSharedPluginData(NS, "key", "page/buttons");
  await figma.setCurrentPageAsync(page);
  for (const oldPage of oldPages) {
    oldPage.remove();
  }
  return page;
}

async function removeGeneratedTokenCollection() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  for (const collection of collections) {
    if (collection.name === TOKEN_COLLECTION_NAME) {
      collection.remove();
    }
  }
}

async function removeGeneratedStyles() {
  const textStyles = await figma.getLocalTextStylesAsync();
  for (const style of textStyles) {
    if (GENERATED_TEXT_STYLES.indexOf(style.name) !== -1) {
      style.remove();
    }
  }

  const effectStyles = await figma.getLocalEffectStylesAsync();
  for (const style of effectStyles) {
    if (GENERATED_EFFECT_STYLES.indexOf(style.name) !== -1) {
      style.remove();
    }
  }
}

async function resolveFonts() {
  const available = await figma.listAvailableFontsAsync();
  const byFamily = {};
  for (const font of available) {
    const family = font.fontName.family;
    if (!byFamily[family]) byFamily[family] = [];
    byFamily[family].push(font.fontName.style);
  }

  function chooseFamily(preferred, fallback) {
    if (byFamily[preferred]) return preferred;
    if (byFamily[fallback]) return fallback;
    return available.length ? available[0].fontName.family : fallback;
  }

  function chooseStyle(family, preferredStyles) {
    const styles = byFamily[family] || [];
    for (const style of preferredStyles) {
      if (styles.indexOf(style) !== -1) return style;
    }
    return styles[0] || "Regular";
  }

  function font(family, preferredStyles) {
    return {
      family,
      style: chooseStyle(family, preferredStyles)
    };
  }

  const webFamily = chooseFamily("Hanken Grotesk", "Inter");
  const displayFamily = chooseFamily("Bricolage Grotesque", "Inter");
  const monoFamily = chooseFamily("JetBrains Mono", "Roboto Mono");
  const mobileFamily = chooseFamily("Inter", webFamily);

  const fonts = {
    webRegular: font(webFamily, ["Regular", "Book", "Medium"]),
    webSemi: font(webFamily, ["Semi Bold", "SemiBold", "Demi Bold", "DemiBold", "Medium", "Bold", "Regular"]),
    webBold: font(webFamily, ["Bold", "Semi Bold", "SemiBold", "Medium"]),
    displayBold: font(displayFamily, ["Extra Bold", "ExtraBold", "Bold", "Semi Bold", "SemiBold"]),
    monoBold: font(monoFamily, ["Bold", "Semi Bold", "SemiBold", "Medium", "Regular"]),
    mobileSemi: font(mobileFamily, ["Semi Bold", "SemiBold", "Medium", "Bold", "Regular"]),
    mobileExtra: font(mobileFamily, ["Extra Bold", "ExtraBold", "Bold", "Semi Bold", "SemiBold"]),
    mobileBlack: font(mobileFamily, ["Black", "Extra Bold", "ExtraBold", "Bold", "Semi Bold", "SemiBold"])
  };

  const unique = {};
  for (const key in fonts) {
    const f = fonts[key];
    unique[f.family + "\n" + f.style] = f;
  }
  for (const key in unique) {
    await figma.loadFontAsync(unique[key]);
  }

  const notes = [];
  if (webFamily !== "Hanken Grotesk") notes.push("Hanken Grotesk -> " + webFamily);
  if (displayFamily !== "Bricolage Grotesque") notes.push("Bricolage Grotesque -> " + displayFamily);
  if (monoFamily !== "JetBrains Mono") notes.push("JetBrains Mono -> " + monoFamily);
  notes.push("mobile system font rendered as " + mobileFamily);
  fonts.note = "Font note: " + (notes.length ? notes.join("; ") : "brand fonts available");

  return fonts;
}

function createTokens() {
  const collection = figma.variables.createVariableCollection(TOKEN_COLLECTION_NAME);
  collection.setSharedPluginData(NS, "key", "collection/tokens");
  collection.renameMode(collection.modes[0].modeId, "Web");

  const modes = { Web: collection.modes[0].modeId };
  for (const modeName of ["Pulse", "Clarity", "Command"]) {
    modes[modeName] = collection.addMode(modeName);
  }

  const vars = {};

  function setModeValues(variable, values) {
    for (const modeName of MODE_NAMES) {
      const value = values[modeName] !== undefined ? values[modeName] : values.Web;
      variable.setValueForMode(modes[modeName], value);
    }
  }

  function createColor(name, values, scopes, cssSyntax) {
    const variable = figma.variables.createVariable(name, collection, "COLOR");
    const converted = {};
    for (const modeName in values) converted[modeName] = variableColor(values[modeName]);
    setModeValues(variable, converted);
    variable.scopes = scopes;
    if (cssSyntax) variable.setVariableCodeSyntax("WEB", cssSyntax);
    variable.setSharedPluginData(NS, "key", "var/" + name);
    vars[name] = variable;
    return variable;
  }

  function createFloat(name, values, scopes, cssSyntax) {
    const variable = figma.variables.createVariable(name, collection, "FLOAT");
    setModeValues(variable, values);
    variable.scopes = scopes;
    if (cssSyntax) variable.setVariableCodeSyntax("WEB", cssSyntax);
    variable.setSharedPluginData(NS, "key", "var/" + name);
    vars[name] = variable;
    return variable;
  }

  createColor("primary", {
    Web: "#5B8CFF",
    Pulse: "#7C3AED",
    Clarity: "#2563EB",
    Command: "#15803D"
  }, ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"], "var(--z-blue)");
  createColor("primaryDeep", {
    Web: "#2A4ED0",
    Pulse: "#7C3AED",
    Clarity: "#2563EB",
    Command: "#15803D"
  }, ["FRAME_FILL", "SHAPE_FILL"], "var(--z-blue-deep)");
  createColor("gradientTop", {
    Web: "#6B97FF",
    Pulse: "#7C3AED",
    Clarity: "#2563EB",
    Command: "#15803D"
  }, ["FRAME_FILL", "SHAPE_FILL"]);
  createColor("onPrimary", {
    Web: "#FFFFFF",
    Pulse: "#FFFFFF",
    Clarity: "#FFFFFF",
    Command: "#FFFFFF"
  }, ["TEXT_FILL", "FRAME_FILL", "SHAPE_FILL"], "var(--primary-foreground)");
  createColor("text", {
    Web: "#EEF2F8",
    Pulse: "#FAFAFA",
    Clarity: "#0F172A",
    Command: "#F8FAFC"
  }, ["TEXT_FILL", "STROKE_COLOR"], "var(--z-text)");
  createColor("muted", {
    Web: "#99A2B4",
    Pulse: "#A1A1AA",
    Clarity: "#64748B",
    Command: "#94A3B8"
  }, ["TEXT_FILL"], "var(--z-muted)");
  createColor("quiet", {
    Web: "#7C869A",
    Pulse: "#71717A",
    Clarity: "#94A3B8",
    Command: "#64748B"
  }, ["TEXT_FILL"], "var(--z-quiet)");
  createColor("surfaceAlt", {
    Web: "rgba(255,255,255,0.045)",
    Pulse: "rgba(124,58,237,0.18)",
    Clarity: "#EAF3FF",
    Command: "#263449"
  }, ["FRAME_FILL", "SHAPE_FILL"], "var(--z-panel-hi)");
  createColor("surfaceHover", {
    Web: "rgba(255,255,255,0.07)",
    Pulse: "rgba(124,58,237,0.24)",
    Clarity: "#DDEBFF",
    Command: "#2E405A"
  }, ["FRAME_FILL", "SHAPE_FILL"]);
  createColor("bg", {
    Web: "#07080C",
    Pulse: "#09090B",
    Clarity: "#F8FAFC",
    Command: "#0F172A"
  }, ["FRAME_FILL"], "var(--z-bg)");
  createColor("bg-1", {
    Web: "#0B0D14",
    Pulse: "rgba(255,255,255,0.05)",
    Clarity: "#FFFFFF",
    Command: "#1E293B"
  }, ["FRAME_FILL", "SHAPE_FILL"], "var(--z-bg-1)");
  createColor("line", {
    Web: "rgba(255,255,255,0.08)",
    Pulse: "rgba(255,255,255,0.12)",
    Clarity: "#D9E2EC",
    Command: "#334155"
  }, ["STROKE_COLOR"], "var(--z-line)");
  createColor("lineHi", {
    Web: "rgba(255,255,255,0.14)",
    Pulse: "rgba(255,255,255,0.18)",
    Clarity: "#C9D6E3",
    Command: "#475569"
  }, ["STROKE_COLOR"], "var(--z-line-hi)");
  createColor("danger", {
    Web: "#FB7185",
    Pulse: "#EF4444",
    Clarity: "#EF4444",
    Command: "#EF4444"
  }, ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"], "var(--z-rose)");
  createColor("success", {
    Web: "#34D399",
    Pulse: "#84CC16",
    Clarity: "#15803D",
    Command: "#22C55E"
  }, ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"], "var(--z-emerald)");
  createColor("saveSurface", {
    Web: "rgba(52,211,153,0.14)",
    Pulse: "rgba(132,204,22,0.16)",
    Clarity: "rgba(21,128,61,0.10)",
    Command: "rgba(34,197,94,0.15)"
  }, ["FRAME_FILL", "SHAPE_FILL"]);
  createColor("saveTextActive", {
    Web: "#04110C",
    Pulse: "#04110C",
    Clarity: "#04110C",
    Command: "#04110C"
  }, ["TEXT_FILL"]);
  createColor("focus", {
    Web: "#5B8CFF",
    Pulse: "#7C3AED",
    Clarity: "#2563EB",
    Command: "#15803D"
  }, ["STROKE_COLOR"], "var(--z-blue)");
  createColor("card", {
    Web: "#0E1016",
    Pulse: "rgba(255,255,255,0.05)",
    Clarity: "#FFFFFF",
    Command: "#1E293B"
  }, ["FRAME_FILL", "SHAPE_FILL"], "var(--z-panel)");
  createColor("primarySurface", {
    Web: "rgba(91,140,255,0.14)",
    Pulse: "rgba(124,58,237,0.16)",
    Clarity: "rgba(37,99,235,0.10)",
    Command: "rgba(21,128,61,0.15)"
  }, ["FRAME_FILL", "SHAPE_FILL"]);
  createColor("warning", {
    Web: "#FBBF24",
    Pulse: "#F59E0B",
    Clarity: "#F59E0B",
    Command: "#D97706"
  }, ["TEXT_FILL", "STROKE_COLOR", "FRAME_FILL", "SHAPE_FILL"], "var(--z-amber)");
  createColor("warningSurface", {
    Web: "rgba(251,191,36,0.14)",
    Pulse: "rgba(245,158,11,0.16)",
    Clarity: "rgba(245,158,11,0.14)",
    Command: "rgba(217,119,6,0.15)"
  }, ["FRAME_FILL", "SHAPE_FILL"]);
  createColor("rangeActive", {
    Web: "rgba(91,140,255,0.16)"
  }, ["FRAME_FILL", "SHAPE_FILL"]);

  createFloat("radius", { Web: 13, Pulse: 20, Clarity: 12, Command: 4 }, ["CORNER_RADIUS"], "var(--radius)");
  createFloat("radius/web-range", { Web: 8 }, ["CORNER_RADIUS"]);
  createFloat("radius/web-small", { Web: 11 }, ["CORNER_RADIUS"]);
  createFloat("radius/web-toggle", { Web: 12 }, ["CORNER_RADIUS"]);
  createFloat("radius/web-pill", { Web: 9 }, ["CORNER_RADIUS"]);
  createFloat("radius/full", { Web: 999 }, ["CORNER_RADIUS"]);
  createFloat("radius/mobile-danger", { Web: 20 }, ["CORNER_RADIUS"]);
  createFloat("size/web-button", { Web: 50 }, ["WIDTH_HEIGHT"]);
  createFloat("size/web-button-small", { Web: 42 }, ["WIDTH_HEIGHT"]);
  createFloat("size/icon-button", { Web: 42 }, ["WIDTH_HEIGHT"]);
  createFloat("size/mobile-button-min", { Web: 48 }, ["WIDTH_HEIGHT"]);
  createFloat("space/0", { Web: 0 }, ["GAP"]);
  createFloat("space/web-button-x", { Web: 24 }, ["GAP"]);
  createFloat("space/web-button-small-x", { Web: 18 }, ["GAP"]);
  createFloat("space/web-button-gap", { Web: 9 }, ["GAP"]);
  createFloat("space/toggle-padding", { Web: 4 }, ["GAP"]);
  createFloat("space/toggle-gap", { Web: 2 }, ["GAP"]);
  createFloat("space/web-pill-x", { Web: 18 }, ["GAP"]);
  createFloat("space/web-pill-y", { Web: 9 }, ["GAP"]);
  createFloat("space/billing-save-x", { Web: 7 }, ["GAP"]);
  createFloat("space/billing-save-y", { Web: 2 }, ["GAP"]);
  createFloat("space/tag-x", { Web: 10 }, ["GAP"]);
  createFloat("space/tag-y", { Web: 4 }, ["GAP"]);
  createFloat("space/brand-x", { Web: 9 }, ["GAP"]);
  createFloat("space/brand-y", { Web: 3 }, ["GAP"]);
  createFloat("space/mobile-button-x", { Web: 18 }, ["GAP"]);
  createFloat("space/mobile-danger-x", { Web: 14 }, ["GAP"]);
  createFloat("space/mobile-danger-y", { Web: 7 }, ["GAP"]);
  createFloat("opacity/pressed", { Web: 0.86 }, ["OPACITY"]);
  createFloat("opacity/disabled", { Web: 0.5 }, ["OPACITY"]);

  return { collection, modes, vars };
}

function createStyles(fonts) {
  const text = {};
  text.web = createTextStyle("Button/Web", fonts.webSemi, 15.5, "AUTO", 0);
  text.webSmall = createTextStyle("Button/Web-Small", fonts.webSemi, 14, "AUTO", 0);
  text.mobile = createTextStyle("Button/Mobile", fonts.mobileExtra, 16, "AUTO", 0);
  text.pillMono = createTextStyle("Pill/Mono", fonts.monoBold, 10.5, "AUTO", 0.84);

  const effects = {};
  effects.primary = createEffectStyle("Shadow/Primary", primaryEffects(false));
  effects.primaryHover = createEffectStyle("Shadow/Primary-Hover", primaryEffects(true));
  effects.pillActive = createEffectStyle("Shadow/Pill-Active", [
    dropShadow(0, 6, 18, "rgba(91,140,255,0.35)")
  ]);

  return { text, effects };
}

function createTextStyle(name, fontName, size, lineHeight, letterSpacing) {
  const style = figma.createTextStyle();
  style.name = name;
  style.fontName = fontName;
  style.fontSize = size;
  style.lineHeight = lineHeight === "AUTO" ? { unit: "AUTO" } : { value: lineHeight, unit: "PIXELS" };
  style.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
  style.setSharedPluginData(NS, "key", "text-style/" + name);
  return style;
}

function createEffectStyle(name, effects) {
  const style = figma.createEffectStyle();
  style.name = name;
  style.effects = effects;
  style.setSharedPluginData(NS, "key", "effect-style/" + name);
  return style;
}

function createWebButtonSet(page, tokens, styles, fonts) {
  const components = [];
  for (const type of ["Primary", "Ghost"]) {
    for (const size of ["Default", "Small"]) {
      for (const state of ["Default", "Hover", "Focus", "Disabled"]) {
        components.push(createWebButtonVariant(type, size, state, tokens, styles, fonts));
      }
    }
  }

  const set = combineAndLayout(page, components, "Web/Button", {
    columns: ["Default", "Hover", "Focus", "Disabled"],
    rows: [
      { Type: "Primary", Size: "Default" },
      { Type: "Primary", Size: "Small" },
      { Type: "Ghost", Size: "Default" },
      { Type: "Ghost", Size: "Small" }
    ],
    columnKey: "State"
  });
  set.description = "Zeno web button. Type=Primary/Ghost, Size=Default/Small, State=Default/Hover/Focus/Disabled.";
  tag(set, "component-set/web-button");
  return set;
}

function createWebButtonVariant(type, size, state, tokens, styles, fonts) {
  const isSmall = size === "Small";
  const height = isSmall ? 42 : 50;
  const fontSize = isSmall ? 14 : 15.5;
  const radius = isSmall ? 11 : 13;
  const component = createAutoComponent("Type=" + type + ", Size=" + size + ", State=" + state, height);
  applyMode(component, tokens, "Web");
  bindHeight(component, tokens.vars[isSmall ? "size/web-button-small" : "size/web-button"], height);
  bindPaddingX(component, tokens.vars[isSmall ? "space/web-button-small-x" : "space/web-button-x"], isSmall ? 18 : 24);
  bindRadius(component, tokens.vars[isSmall ? "radius/web-small" : "radius"], radius);
  component.itemSpacing = 9;
  component.setBoundVariable("itemSpacing", tokens.vars["space/web-button-gap"]);

  if (type === "Primary") {
    bindFills(component, tokens.vars.primary, "#5B8CFF");
    component.strokes = [];
    component.effects = state === "Hover" || state === "Focus" ? primaryEffects(true) : primaryEffects(false);
    component.effectStyleId = state === "Hover" || state === "Focus" ? styles.effects.primaryHover.id : styles.effects.primary.id;
  } else {
    bindFills(component, state === "Hover" ? tokens.vars.surfaceHover : tokens.vars.surfaceAlt, state === "Hover" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.045)");
    bindStroke(component, tokens.vars.lineHi, "rgba(255,255,255,0.14)", 1, "INSIDE");
    component.effects = [];
  }

  if (state === "Disabled") {
    component.effects = [];
    component.opacity = 0.5;
    component.setBoundVariable("opacity", tokens.vars["opacity/disabled"]);
  }

  const label = createText("Button", fonts.webSemi, fontSize, "#FFFFFF", { lineHeight: "AUTO" });
  bindFills(label, type === "Primary" ? tokens.vars.onPrimary : tokens.vars.text, type === "Primary" ? "#FFFFFF" : "#EEF2F8");
  component.appendChild(label);
  label.layoutSizingHorizontal = "HUG";
  label.layoutSizingVertical = "HUG";

  if (type === "Primary") {
    addGradientLayer(component, tokens.vars[isSmall ? "radius/web-small" : "radius"], radius);
  }

  if (state === "Focus") {
    addFocusRing(component, tokens, radius);
  }

  tag(component, "component/web-button/" + type + "/" + size + "/" + state);
  return component;
}

function createCtaSet(page, tokens, styles, fonts) {
  const components = [];
  for (const state of ["Default", "Hover"]) {
    const component = createAutoComponent("State=" + state, 50);
    applyMode(component, tokens, "Web");
    bindHeight(component, tokens.vars["size/web-button"], 50);
    bindPaddingX(component, tokens.vars["space/web-button-x"], 24);
    bindRadius(component, tokens.vars.radius, 13);
    component.itemSpacing = 9;
    component.setBoundVariable("itemSpacing", tokens.vars["space/web-button-gap"]);
    bindFills(component, tokens.vars.primary, "#5B8CFF");
    component.strokes = [];
    component.effects = state === "Hover" ? primaryEffects(true) : primaryEffects(false);
    component.effectStyleId = state === "Hover" ? styles.effects.primaryHover.id : styles.effects.primary.id;

    const label = createText("Start free", fonts.webSemi, 15.5, "#FFFFFF", {});
    bindFills(label, tokens.vars.onPrimary, "#FFFFFF");
    component.appendChild(label);
    label.layoutSizingHorizontal = "HUG";
    label.layoutSizingVertical = "HUG";
    addGradientLayer(component, tokens.vars.radius, 13);

    tag(component, "component/web-cta/" + state);
    components.push(component);
  }

  const set = combineAndLayout(page, components, "Web/Button/CTA", {
    columns: ["Default", "Hover"],
    rows: [{}],
    columnKey: "State",
    extraY: (props) => props.State === "Hover" ? -1 : 0
  });
  set.description = "Primary CTA matching apps/web/components/site/content.module.css .cta.";
  tag(set, "component-set/web-cta");
  return set;
}

function createSegmentedToggleSet(page, tokens, styles, fonts) {
  const components = [];
  for (const active of ["Monthly", "Yearly"]) {
    const component = createAutoComponent("Active=" + active, 48);
    applyMode(component, tokens, "Web");
    component.paddingLeft = 4;
    component.paddingRight = 4;
    component.paddingTop = 4;
    component.paddingBottom = 4;
    component.setBoundVariable("paddingLeft", tokens.vars["space/toggle-padding"]);
    component.setBoundVariable("paddingRight", tokens.vars["space/toggle-padding"]);
    component.setBoundVariable("paddingTop", tokens.vars["space/toggle-padding"]);
    component.setBoundVariable("paddingBottom", tokens.vars["space/toggle-padding"]);
    component.itemSpacing = 2;
    component.setBoundVariable("itemSpacing", tokens.vars["space/toggle-gap"]);
    bindRadius(component, tokens.vars["radius/web-toggle"], 12);
    bindFills(component, tokens.vars["bg-1"], "#0B0D14");
    bindStroke(component, tokens.vars.line, "rgba(255,255,255,0.08)", 1, "INSIDE");

    const monthly = createSegmentedChild("Monthly", active === "Monthly", false, tokens, styles, fonts);
    const yearly = createSegmentedChild("Yearly", active === "Yearly", true, tokens, styles, fonts);
    component.appendChild(monthly);
    component.appendChild(yearly);
    tag(component, "component/web-toggle/" + active);
    components.push(component);
  }

  const set = combineAndLayout(page, components, "Web/SegmentedToggle", {
    columns: ["Monthly", "Yearly"],
    rows: [{}],
    columnKey: "Active"
  });
  set.description = "Billing segmented toggle with active save pill treatment.";
  tag(set, "component-set/web-segmented-toggle");
  return set;
}

function createSegmentedChild(labelText, active, hasSave, tokens, styles, fonts) {
  const frame = createAutoFrame("pill", 36);
  applyMode(frame, tokens, "Web");
  frame.paddingLeft = 18;
  frame.paddingRight = 18;
  frame.paddingTop = 9;
  frame.paddingBottom = 9;
  frame.itemSpacing = 8;
  bindRadius(frame, tokens.vars["radius/web-pill"], 9);
  if (active) {
    bindFills(frame, tokens.vars.primary, "#5B8CFF");
    frame.effects = styles.effects.pillActive.effects;
    frame.effectStyleId = styles.effects.pillActive.id;
  } else {
    frame.fills = [];
    frame.effects = [];
  }

  const label = createText(labelText, fonts.webSemi, 14, active ? "#FFFFFF" : "#99A2B4", {});
  bindFills(label, active ? tokens.vars.onPrimary : tokens.vars.muted, active ? "#FFFFFF" : "#99A2B4");
  frame.appendChild(label);
  label.layoutSizingHorizontal = "HUG";
  label.layoutSizingVertical = "HUG";

  if (hasSave) {
    const save = createSavePill(active, tokens, fonts);
    frame.appendChild(save);
  }

  if (active) {
    addGradientLayer(frame, tokens.vars["radius/web-pill"], 9);
  }

  return frame;
}

function createWebPillSet(page, tokens, styles, fonts) {
  const states = ["Inactive", "Hover", "Active"];
  const components = states.map((state) => createWebPillVariant(state, tokens, styles, fonts));
  const set = combineAndLayout(page, components, "Web/Pill", {
    columns: states,
    rows: [{}],
    columnKey: "State"
  });
  set.description = "Billing pill variants, including inactive hover and active save sub-pill.";
  tag(set, "component-set/web-pill");
  return set;
}

function createWebPillVariant(state, tokens, styles, fonts) {
  const active = state === "Active";
  const hover = state === "Hover";
  const component = createAutoComponent("State=" + state, 38);
  applyMode(component, tokens, "Web");
  component.paddingLeft = 18;
  component.paddingRight = 18;
  component.paddingTop = 9;
  component.paddingBottom = 9;
  component.setBoundVariable("paddingLeft", tokens.vars["space/web-pill-x"]);
  component.setBoundVariable("paddingRight", tokens.vars["space/web-pill-x"]);
  component.setBoundVariable("paddingTop", tokens.vars["space/web-pill-y"]);
  component.setBoundVariable("paddingBottom", tokens.vars["space/web-pill-y"]);
  component.itemSpacing = 8;
  bindRadius(component, tokens.vars["radius/web-pill"], 9);
  if (active) {
    bindFills(component, tokens.vars.primary, "#5B8CFF");
    component.effects = styles.effects.pillActive.effects;
    component.effectStyleId = styles.effects.pillActive.id;
  } else {
    component.fills = [];
    component.effects = [];
  }

  const label = createText("Yearly", fonts.webSemi, 14, active ? "#FFFFFF" : hover ? "#EEF2F8" : "#99A2B4", {});
  bindFills(label, active ? tokens.vars.onPrimary : hover ? tokens.vars.text : tokens.vars.muted, active ? "#FFFFFF" : hover ? "#EEF2F8" : "#99A2B4");
  component.appendChild(label);
  label.layoutSizingHorizontal = "HUG";
  label.layoutSizingVertical = "HUG";

  component.appendChild(createSavePill(active, tokens, fonts));
  if (active) {
    addGradientLayer(component, tokens.vars["radius/web-pill"], 9);
  }
  tag(component, "component/web-pill/" + state);
  return component;
}

function createSavePill(active, tokens, fonts) {
  const save = createAutoFrame("save", 17);
  applyMode(save, tokens, "Web");
  save.paddingLeft = 7;
  save.paddingRight = 7;
  save.paddingTop = 2;
  save.paddingBottom = 2;
  save.setBoundVariable("paddingLeft", tokens.vars["space/billing-save-x"]);
  save.setBoundVariable("paddingRight", tokens.vars["space/billing-save-x"]);
  save.setBoundVariable("paddingTop", tokens.vars["space/billing-save-y"]);
  save.setBoundVariable("paddingBottom", tokens.vars["space/billing-save-y"]);
  bindRadius(save, tokens.vars["radius/full"], 999);
  bindFills(save, active ? tokens.vars.success : tokens.vars.saveSurface, active ? "#34D399" : "rgba(52,211,153,0.14)");

  const label = createText("SAVE", fonts.monoBold, 10.5, active ? "#04110C" : "#34D399", {
    letterSpacing: 0.21
  });
  bindFills(label, active ? tokens.vars.saveTextActive : tokens.vars.success, active ? "#04110C" : "#34D399");
  save.appendChild(label);
  label.layoutSizingHorizontal = "HUG";
  label.layoutSizingVertical = "HUG";
  return save;
}

function createTagComponent(page, kind, tokens, fonts) {
  const isBrand = kind === "Brand";
  const component = createAutoComponent("Web/Pill/" + kind, 24);
  applyMode(component, tokens, "Web");
  component.paddingLeft = isBrand ? 9 : 10;
  component.paddingRight = isBrand ? 9 : 10;
  component.paddingTop = isBrand ? 3 : 4;
  component.paddingBottom = isBrand ? 3 : 4;
  component.setBoundVariable("paddingLeft", tokens.vars[isBrand ? "space/brand-x" : "space/tag-x"]);
  component.setBoundVariable("paddingRight", tokens.vars[isBrand ? "space/brand-x" : "space/tag-x"]);
  component.setBoundVariable("paddingTop", tokens.vars[isBrand ? "space/brand-y" : "space/tag-y"]);
  component.setBoundVariable("paddingBottom", tokens.vars[isBrand ? "space/brand-y" : "space/tag-y"]);
  bindRadius(component, tokens.vars["radius/full"], 999);
  bindFills(component, tokens.vars.primary, "#5B8CFF");

  const label = createText(isBrand ? "ZENO" : "POPULAR", fonts.monoBold, isBrand ? 11 : 10.5, "#FFFFFF", {
    letterSpacing: isBrand ? 0.44 : 0.84
  });
  bindFills(label, tokens.vars.onPrimary, "#FFFFFF");
  component.appendChild(label);
  label.layoutSizingHorizontal = "HUG";
  label.layoutSizingVertical = "HUG";
  addGradientLayer(component, tokens.vars["radius/full"], 999);
  tag(component, "component/web-pill-" + kind.toLowerCase());
  page.appendChild(component);
  return component;
}

function createIconButtonSet(page, tokens, fonts) {
  const components = [];
  for (const icon of ["Menu", "Close"]) {
    for (const state of ["Default", "Hover"]) {
      const component = createAutoComponent("Icon=" + icon + ", State=" + state, 42);
      applyMode(component, tokens, "Web");
      component.primaryAxisSizingMode = "FIXED";
      component.counterAxisSizingMode = "FIXED";
      component.resize(42, 42);
      bindHeight(component, tokens.vars["size/icon-button"], 42);
      component.setBoundVariable("width", tokens.vars["size/icon-button"]);
      component.paddingLeft = 0;
      component.paddingRight = 0;
      component.paddingTop = 0;
      component.paddingBottom = 0;
      bindRadius(component, tokens.vars["radius/web-small"], 11);
      bindFills(component, state === "Hover" ? tokens.vars.surfaceHover : tokens.vars.surfaceAlt, state === "Hover" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.045)");
      bindStroke(component, tokens.vars.lineHi, "rgba(255,255,255,0.14)", 1, "INSIDE");
      component.appendChild(createNavIcon(icon, tokens));
      tag(component, "component/web-icon-button/" + icon + "/" + state);
      components.push(component);
    }
  }
  const set = combineAndLayout(page, components, "Web/IconButton", {
    columns: ["Default", "Hover"],
    rows: [{ Icon: "Menu" }, { Icon: "Close" }],
    columnKey: "State"
  });
  set.description = "Mobile nav toggle icon button with menu and close glyph variants.";
  tag(set, "component-set/web-icon-button");
  return set;
}

function createNavIcon(icon, tokens) {
  const frame = figma.createFrame();
  frame.name = "icon";
  frame.resize(18, 12);
  frame.fills = [];
  frame.clipsContent = false;

  if (icon === "Menu") {
    for (const y of [0, 5, 10]) {
      const bar = createBar(tokens);
      bar.x = 0;
      bar.y = y;
      frame.appendChild(bar);
    }
  } else {
    const barA = createBar(tokens);
    barA.x = 1;
    barA.y = 5;
    barA.rotation = 45;
    frame.appendChild(barA);
    const barB = createBar(tokens);
    barB.x = 1;
    barB.y = 5;
    barB.rotation = -45;
    frame.appendChild(barB);
  }

  return frame;
}

function createBar(tokens) {
  const bar = figma.createRectangle();
  bar.name = "bar";
  bar.resize(18, 2);
  bar.cornerRadius = 2;
  bindFills(bar, tokens.vars.text, "#EEF2F8");
  return bar;
}

function createMobileButtonSet(page, kind, tokens, fonts) {
  const components = [];
  for (const theme of ["Pulse", "Clarity", "Command"]) {
    for (const state of ["Default", "Pressed", "Disabled"]) {
      components.push(createMobileButtonVariant(kind, theme, state, tokens, fonts));
    }
  }

  const set = combineAndLayout(page, components, "Mobile/" + kind, {
    columns: ["Default", "Pressed", "Disabled"],
    rows: [{ Theme: "Pulse" }, { Theme: "Clarity" }, { Theme: "Command" }],
    columnKey: "State"
  });
  set.description = kind === "PrimaryButton"
    ? "React Native PrimaryButton mapped from apps/mobile/src/components/ui.tsx."
    : "Secondary mobile button using theme.surfaceAlt and theme.primary.";
  tag(set, "component-set/mobile-" + kind.toLowerCase());
  return set;
}

function createMobileButtonVariant(kind, theme, state, tokens, fonts) {
  const component = createAutoComponent("Theme=" + theme + ", State=" + state, 48);
  applyMode(component, tokens, theme);
  bindHeight(component, tokens.vars["size/mobile-button-min"], 48);
  component.minHeight = 48;
  component.setBoundVariable("minHeight", tokens.vars["size/mobile-button-min"]);
  bindPaddingX(component, tokens.vars["space/mobile-button-x"], 18);
  bindRadius(component, tokens.vars.radius, theme === "Pulse" ? 20 : theme === "Clarity" ? 12 : 4);

  if (kind === "PrimaryButton") {
    bindFills(component, tokens.vars.primary, themeColor(theme, "primary"));
  } else {
    bindFills(component, tokens.vars.surfaceAlt, themeColor(theme, "surfaceAlt"));
  }
  component.strokes = [];
  component.effects = [];

  if (state === "Pressed") {
    component.opacity = 0.86;
    component.setBoundVariable("opacity", tokens.vars["opacity/pressed"]);
  }
  if (state === "Disabled") {
    component.opacity = 0.5;
    component.setBoundVariable("opacity", tokens.vars["opacity/disabled"]);
  }

  const labelFont = theme === "Pulse" ? fonts.mobileBlack : fonts.mobileExtra;
  const label = createText(kind === "PrimaryButton" ? "Continue" : "Maybe later", labelFont, 16, "#FFFFFF", {});
  bindFills(label, kind === "PrimaryButton" ? tokens.vars.onPrimary : tokens.vars.primary, kind === "PrimaryButton" ? "#FFFFFF" : themeColor(theme, "primary"));
  component.appendChild(label);
  label.layoutSizingHorizontal = "HUG";
  label.layoutSizingVertical = "HUG";

  tag(component, "component/mobile-" + kind.toLowerCase() + "/" + theme + "/" + state);
  return component;
}

function createDangerPillSet(page, tokens, fonts) {
  const components = [];
  for (const theme of ["Pulse", "Clarity", "Command"]) {
    const component = createAutoComponent("Theme=" + theme, 32);
    applyMode(component, tokens, theme);
    component.paddingLeft = 14;
    component.paddingRight = 14;
    component.paddingTop = 7;
    component.paddingBottom = 7;
    component.setBoundVariable("paddingLeft", tokens.vars["space/mobile-danger-x"]);
    component.setBoundVariable("paddingRight", tokens.vars["space/mobile-danger-x"]);
    component.setBoundVariable("paddingTop", tokens.vars["space/mobile-danger-y"]);
    component.setBoundVariable("paddingBottom", tokens.vars["space/mobile-danger-y"]);
    bindRadius(component, tokens.vars["radius/mobile-danger"], 20);
    bindFills(component, tokens.vars.danger, "#EF4444");
    const label = createText("Cancel", fonts.mobileSemi, 12, "#FFFFFF", {});
    bindFills(label, tokens.vars.onPrimary, "#FFFFFF");
    component.appendChild(label);
    label.layoutSizingHorizontal = "HUG";
    label.layoutSizingVertical = "HUG";
    tag(component, "component/mobile-danger-pill/" + theme);
    components.push(component);
  }

  const set = combineAndLayout(page, components, "Mobile/DangerPill", {
    columns: ["Pulse", "Clarity", "Command"],
    rows: [{}],
    columnKey: "Theme"
  });
  set.description = "In-app Cancel pill.";
  tag(set, "component-set/mobile-danger-pill");
  return set;
}

function createTextButtonSet(page, tokens, fonts) {
  const components = [];
  for (const theme of ["Pulse", "Clarity", "Command"]) {
    const component = createAutoComponent("Theme=" + theme, 32);
    applyMode(component, tokens, theme);
    component.paddingLeft = 0;
    component.paddingRight = 0;
    component.paddingTop = 0;
    component.paddingBottom = 0;
    component.fills = [];
    component.strokes = [];
    const label = createText("Undo", fonts.mobileSemi, 12, themeColor(theme, "primary"), {});
    bindFills(label, tokens.vars.primary, themeColor(theme, "primary"));
    component.appendChild(label);
    label.layoutSizingHorizontal = "HUG";
    label.layoutSizingVertical = "HUG";
    tag(component, "component/mobile-text-button/" + theme);
    components.push(component);
  }

  const set = combineAndLayout(page, components, "Mobile/TextButton", {
    columns: ["Pulse", "Clarity", "Command"],
    rows: [{}],
    columnKey: "Theme"
  });
  set.description = "Transparent Undo text button.";
  tag(set, "component-set/mobile-text-button");
  return set;
}

function createThemeToggleSet(page, tokens, fonts) {
  const segments = [
    { theme: "Pulse", label: "⚡ Pulse" },
    { theme: "Clarity", label: "◈ Clarity" },
    { theme: "Command", label: "> Command" }
  ];
  const components = [];
  for (const active of ["Pulse", "Clarity", "Command"]) {
    const component = createAutoComponent("Active=" + active, 44);
    applyMode(component, tokens, active);
    component.primaryAxisSizingMode = "FIXED";
    component.resize(312, 44);
    component.paddingLeft = 4; component.paddingRight = 4; component.paddingTop = 4; component.paddingBottom = 4;
    component.itemSpacing = 4;
    component.setBoundVariable("itemSpacing", tokens.vars["space/toggle-padding"]);
    bindRadius(component, tokens.vars.radius, active === "Pulse" ? 20 : active === "Clarity" ? 12 : 4);
    bindFills(component, tokens.vars.card, themeColor(active, "card"));
    bindStroke(component, tokens.vars.line, "rgba(255,255,255,0.12)", 1, "INSIDE");

    for (const seg of segments) {
      const isActive = seg.theme === active;
      const tab = createAutoFrame("seg", 34);
      applyMode(tab, tokens, active);
      tab.paddingTop = 6; tab.paddingBottom = 6;
      tab.cornerRadius = Math.max(4, (active === "Pulse" ? 20 : active === "Clarity" ? 12 : 4) - 2);
      if (isActive) bindFills(tab, tokens.vars.primary, themeColor(active, "primary"));
      else tab.fills = [];
      const label = createText(seg.label, fonts.mobileBlack, 12, isActive ? "#FFFFFF" : themeColor(active, "mutedText"), {});
      bindFills(label, isActive ? tokens.vars.onPrimary : tokens.vars.muted, isActive ? "#FFFFFF" : themeColor(active, "mutedText"));
      tab.appendChild(label);
      label.layoutSizingHorizontal = "HUG";
      label.layoutSizingVertical = "HUG";
      component.appendChild(tab);
      tab.layoutGrow = 1;
      tab.layoutSizingHorizontal = "FILL";
      tab.layoutSizingVertical = "FILL";
    }
    tag(component, "component/mobile-theme-toggle/" + active);
    components.push(component);
  }

  const set = combineAndLayout(page, components, "Mobile/ThemeToggle", {
    columns: ["Pulse", "Clarity", "Command"],
    rows: [{}],
    columnKey: "Active",
    gapY: 18
  });
  set.description = "3-way theme switch (Pulse/Clarity/Command) from apps/mobile/src/components/ui.tsx ThemeToggle.";
  tag(set, "component-set/mobile-theme-toggle");
  return set;
}

function createFeaturePillSet(page, tokens, fonts) {
  const components = [];
  for (const theme of ["Pulse", "Clarity", "Command"]) {
    for (const state of ["Active", "Locked"]) {
      const active = state === "Active";
      const component = createAutoComponent("Theme=" + theme + ", State=" + state, 34);
      applyMode(component, tokens, theme);
      component.paddingLeft = 12; component.paddingRight = 12; component.paddingTop = 8; component.paddingBottom = 8;
      bindRadius(component, tokens.vars["radius/mobile-danger"], 20);
      bindFills(component, active ? tokens.vars.primarySurface : tokens.vars.warningSurface, active ? themeColor(theme, "primarySurface") : themeColor(theme, "warningSurface"));
      bindStroke(component, active ? tokens.vars.primary : tokens.vars.warning, active ? themeColor(theme, "primary") : themeColor(theme, "warning"), 0.5, "INSIDE");
      const label = createText(active ? "Spend Twin" : "🔒 Business Tier", fonts.mobileSemi, 13, active ? themeColor(theme, "primary") : themeColor(theme, "warning"), {});
      bindFills(label, active ? tokens.vars.primary : tokens.vars.warning, active ? themeColor(theme, "primary") : themeColor(theme, "warning"));
      component.appendChild(label);
      label.layoutSizingHorizontal = "HUG";
      label.layoutSizingVertical = "HUG";
      tag(component, "component/mobile-feature-pill/" + theme + "/" + state);
      components.push(component);
    }
  }
  const set = combineAndLayout(page, components, "Mobile/FeaturePill", {
    columns: ["Active", "Locked"],
    rows: [{ Theme: "Pulse" }, { Theme: "Clarity" }, { Theme: "Command" }],
    columnKey: "State"
  });
  set.description = "Intelligence-suite chips (active vs locked) from the mobile dashboard.";
  tag(set, "component-set/mobile-feature-pill");
  return set;
}

function createRangeToggleSet(page, tokens, fonts) {
  const components = [];
  for (const state of ["Inactive", "Hover", "Active"]) {
    const active = state === "Active";
    const hover = state === "Hover";
    const component = createAutoComponent("State=" + state, 34);
    applyMode(component, tokens, "Web");
    component.paddingLeft = 15; component.paddingRight = 15; component.paddingTop = 8; component.paddingBottom = 8;
    bindRadius(component, tokens.vars["radius/web-range"], 8);
    if (active) bindFills(component, tokens.vars.rangeActive, "rgba(91,140,255,0.16)");
    else component.fills = [];
    const label = createText("30D", fonts.monoBold, 12.5, active ? "#FFFFFF" : hover ? "#EEF2F8" : "#99A2B4", {});
    bindFills(label, active ? tokens.vars.onPrimary : hover ? tokens.vars.text : tokens.vars.muted, active ? "#FFFFFF" : hover ? "#EEF2F8" : "#99A2B4");
    component.appendChild(label);
    label.layoutSizingHorizontal = "HUG";
    label.layoutSizingVertical = "HUG";
    tag(component, "component/web-range-toggle/" + state);
    components.push(component);
  }
  const set = combineAndLayout(page, components, "Web/RangeToggle", {
    columns: ["Inactive", "Hover", "Active"],
    rows: [{}],
    columnKey: "State"
  });
  set.description = "Analytics range toggle (apps/web/app/analytics/analytics.module.css .rangeBtn).";
  tag(set, "component-set/web-range-toggle");
  return set;
}

function createAutoComponent(name, height) {
  const component = figma.createComponent();
  component.name = name;
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisSizingMode = "AUTO";
  component.counterAxisSizingMode = "FIXED";
  component.primaryAxisAlignItems = "CENTER";
  component.counterAxisAlignItems = "CENTER";
  component.paddingTop = 0;
  component.paddingBottom = 0;
  component.paddingLeft = 0;
  component.paddingRight = 0;
  component.itemSpacing = 0;
  component.clipsContent = false;
  component.resize(120, height);
  return component;
}

function createAutoFrame(name, height) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.primaryAxisAlignItems = "CENTER";
  frame.counterAxisAlignItems = "CENTER";
  frame.paddingTop = 0;
  frame.paddingBottom = 0;
  frame.paddingLeft = 0;
  frame.paddingRight = 0;
  frame.itemSpacing = 0;
  frame.clipsContent = false;
  frame.resize(80, height);
  return frame;
}

function combineAndLayout(page, components, name, config) {
  const set = figma.combineAsVariants(components, page);
  set.name = name;
  set.fills = [];
  set.clipsContent = false;

  const pad = config.padding || 32;
  const gapX = config.gapX || 28;
  const gapY = config.gapY || 22;
  let maxChildWidth = 0;
  let maxChildHeight = 0;
  for (const child of set.children) {
    maxChildWidth = Math.max(maxChildWidth, child.width);
    maxChildHeight = Math.max(maxChildHeight, child.height);
  }

  const cellWidth = Math.ceil(maxChildWidth + gapX);
  const cellHeight = Math.ceil(maxChildHeight + gapY);

  for (const child of set.children) {
    const props = variantProps(child.name);
    const col = config.columns.indexOf(props[config.columnKey]);
    const row = rowIndex(props, config.rows);
    const extraY = config.extraY ? config.extraY(props) : 0;
    child.x = pad + Math.max(0, col) * cellWidth;
    child.y = pad + Math.max(0, row) * cellHeight + extraY;
  }

  let maxX = 0;
  let maxY = 0;
  for (const child of set.children) {
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }
  set.resizeWithoutConstraints(maxX + pad, maxY + pad);
  return set;
}

function rowIndex(props, rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let match = true;
    for (const key in row) {
      if (props[key] !== row[key]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return 0;
}

function variantProps(name) {
  const result = {};
  const parts = name.split(", ");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx !== -1) result[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return result;
}

function positionWithCaption(page, node, x, y, caption, fonts) {
  node.x = x;
  node.y = y;
  const text = createText(caption, fonts.monoBold, 10.5, "#7C869A", {
    lineHeight: 16,
    letterSpacing: 0.1
  });
  text.x = x;
  text.y = y + node.height + 12;
  page.appendChild(text);
  tag(text, "caption/" + node.name);
}

function addSectionHeading(page, label, y, fonts) {
  const heading = createText(label, fonts.displayBold, 28, "#EEF2F8", {
    lineHeight: 34
  });
  heading.x = 80;
  heading.y = y;
  page.appendChild(heading);
  tag(heading, "section/" + label);

  const rule = figma.createRectangle();
  rule.name = label + " rule";
  rule.resize(1180, 1);
  rule.x = 80;
  rule.y = y + 44;
  rule.fills = [solidPaint("rgba(255,255,255,0.08)")];
  page.appendChild(rule);
  tag(rule, "section-rule/" + label);
}

function addFocusRing(component, tokens, radius) {
  const ring = figma.createRectangle();
  ring.name = "focus ring";
  ring.layoutPositioning = "ABSOLUTE";
  // App uses outline 2px solid + outline-offset 2px → 2px gap, then a 2px ring.
  ring.resize(component.width + 4, component.height + 4);
  ring.x = -2;
  ring.y = -2;
  ring.fills = [];
  ring.cornerRadius = radius + 2;
  bindStroke(ring, tokens.vars.focus, "#5B8CFF", 2, "OUTSIDE");
  component.insertChild(0, ring);
}

function addGradientLayer(container, radiusVariable, radiusFallback) {
  const gradient = figma.createRectangle();
  gradient.name = "gradient fill";
  gradient.layoutPositioning = "ABSOLUTE";
  gradient.x = 0;
  gradient.y = 0;
  gradient.resize(container.width, container.height);
  gradient.fills = [primaryGradient()];
  bindRadius(gradient, radiusVariable, radiusFallback);
  container.insertChild(0, gradient);
}

function createText(characters, fontName, fontSize, fill, options) {
  const text = figma.createText();
  text.name = options && options.name ? options.name : "label";
  text.fontName = fontName;
  text.fontSize = fontSize;
  text.lineHeight = options && options.lineHeight && options.lineHeight !== "AUTO"
    ? { value: options.lineHeight, unit: "PIXELS" }
    : { unit: "AUTO" };
  text.letterSpacing = { value: options && options.letterSpacing ? options.letterSpacing : 0, unit: "PIXELS" };
  text.characters = characters;
  text.fills = [solidPaint(fill)];
  return text;
}

function bindHeight(node, variable, fallback) {
  node.resize(node.width, fallback);
  node.setBoundVariable("height", variable);
}

function bindPaddingX(node, variable, fallback) {
  node.paddingLeft = fallback;
  node.paddingRight = fallback;
  node.setBoundVariable("paddingLeft", variable);
  node.setBoundVariable("paddingRight", variable);
}

function bindRadius(node, variable, fallback) {
  node.cornerRadius = fallback;
  node.setBoundVariable("topLeftRadius", variable);
  node.setBoundVariable("topRightRadius", variable);
  node.setBoundVariable("bottomLeftRadius", variable);
  node.setBoundVariable("bottomRightRadius", variable);
}

function bindFills(node, variable, fallback) {
  node.fills = [
    figma.variables.setBoundVariableForPaint(solidPaint(fallback), "color", variable)
  ];
}

function bindStroke(node, variable, fallback, weight, align) {
  node.strokes = [
    figma.variables.setBoundVariableForPaint(solidPaint(fallback), "color", variable)
  ];
  node.strokeWeight = weight;
  node.strokeAlign = align;
}

function applyMode(node, tokens, modeName) {
  const actualModeName = MODE_TO_THEME[modeName] || modeName;
  node.setExplicitVariableModeForCollection(tokens.collection, tokens.modes[actualModeName]);
}

function primaryGradient() {
  return {
    type: "GRADIENT_LINEAR",
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: color("#6B97FF") },
      { position: 1, color: color("#2A4ED0") }
    ]
  };
}

function primaryEffects(hover) {
  return [
    dropShadow(0, hover ? 14 : 10, hover ? 44 : 34, hover ? "rgba(91,140,255,0.55)" : "rgba(91,140,255,0.40)"),
    innerShadow(0, 1, 0, hover ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.25)")
  ];
}

function dropShadow(x, y, radius, fill) {
  return {
    type: "DROP_SHADOW",
    color: color(fill),
    offset: { x, y },
    radius,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  };
}

function innerShadow(x, y, radius, fill) {
  return {
    type: "INNER_SHADOW",
    color: color(fill),
    offset: { x, y },
    radius,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  };
}

function solidPaint(value) {
  const c = color(value);
  const paint = {
    type: "SOLID",
    color: { r: c.r, g: c.g, b: c.b }
  };
  if (c.a !== 1) paint.opacity = c.a;
  return paint;
}

function variableColor(value) {
  const c = color(value);
  if (c.a === 1) return { r: c.r, g: c.g, b: c.b };
  return c;
}

function color(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed[0] === "#") {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((ch) => ch + ch).join("");
    }
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  const rgbaMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((part) => part.trim());
    return {
      r: parseFloat(parts[0]) / 255,
      g: parseFloat(parts[1]) / 255,
      b: parseFloat(parts[2]) / 255,
      a: parts[3] === undefined ? 1 : parseFloat(parts[3])
    };
  }
  throw new Error("Unsupported color: " + value);
}

function themeColor(theme, key) {
  const values = {
    Pulse: {
      primary: "#7C3AED", surfaceAlt: "rgba(124,58,237,0.18)", card: "rgba(255,255,255,0.05)",
      mutedText: "#A1A1AA", primarySurface: "rgba(124,58,237,0.16)", warning: "#F59E0B", warningSurface: "rgba(245,158,11,0.16)"
    },
    Clarity: {
      primary: "#2563EB", surfaceAlt: "#EAF3FF", card: "#FFFFFF",
      mutedText: "#64748B", primarySurface: "rgba(37,99,235,0.10)", warning: "#F59E0B", warningSurface: "rgba(245,158,11,0.14)"
    },
    Command: {
      primary: "#15803D", surfaceAlt: "#263449", card: "#1E293B",
      mutedText: "#94A3B8", primarySurface: "rgba(21,128,61,0.15)", warning: "#D97706", warningSurface: "rgba(217,119,6,0.15)"
    }
  };
  return values[theme][key];
}

function tag(node, key) {
  node.setSharedPluginData(NS, "key", key);
}
