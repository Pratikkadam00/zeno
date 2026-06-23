import React from "react";

/**
 * Zeno Icon — renders a Lucide icon by name.
 * Requires the Lucide CDN script to be present on the page
 * (<script src="https://unpkg.com/lucide@latest"></script>).
 * Names are kebab-case Lucide names: "wallet", "calendar", "chevron-right"…
 */
let _styleInjected = false;
function ensureStyle() {
  if (_styleInjected || typeof document === "undefined") return;
  _styleInjected = true;
  const el = document.createElement("style");
  el.textContent =
    "span[data-zeno-icon]>svg{width:100%;height:100%;display:block;stroke-width:var(--zeno-icon-sw,2)}";
  document.head.appendChild(el);
}

export function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2, style, ...rest }) {
  const ref = React.useRef(null);
  ensureStyle();
  React.useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    host.appendChild(i);
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }, [name]);

  return (
    <span
      ref={ref}
      data-zeno-icon={name}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        color,
        flex: "none",
        "--zeno-icon-sw": strokeWidth,
        ...style,
      }}
      {...rest}
    />
  );
}
