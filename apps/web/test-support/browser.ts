// Controllable stand-ins for the browser APIs jsdom lacks. Each test sets only
// what it needs; setup.ts resets everything after every test.
//
// - matchMedia: a query matches when setMedia() says so. MediaQueryLists stay
//   live (Motion keeps the one it asked for and listens for "change"), so a
//   later setMedia() updates `matches` and notifies listeners.
// - IntersectionObserver: nothing is ever "in view" until revealAll() says so.
// - Element.prototype.animate: present unless setAnimateSupport(false).

type Listener = (event: MediaQueryListEvent) => void;

const media = new Map<string, boolean>();
const lists = new Set<{ query: string; listeners: Set<Listener> }>();

// Motion asks for "(prefers-reduced-motion)"; the site asks for
// "(prefers-reduced-motion: reduce)". Both mean the same OS setting.
const canonical = (query: string) => (query.trim() === "(prefers-reduced-motion)" ? "(prefers-reduced-motion: reduce)" : query.trim());

export function setMedia(query: string, matches: boolean): void {
  media.set(canonical(query), matches);
  for (const list of lists) {
    if (canonical(list.query) !== canonical(query)) continue;
    for (const listener of list.listeners) listener({ matches, media: list.query } as MediaQueryListEvent);
  }
}

function matchMedia(query: string): MediaQueryList {
  const entry = { query, listeners: new Set<Listener>() };
  lists.add(entry);
  return {
    media: query,
    get matches() {
      return media.get(canonical(query)) ?? false;
    },
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => entry.listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => entry.listeners.delete(listener),
    addListener: (listener: Listener) => entry.listeners.add(listener),
    removeListener: (listener: Listener) => entry.listeners.delete(listener),
    dispatchEvent: () => true
  } as unknown as MediaQueryList;
}

type Observed = { callback: IntersectionObserverCallback; observer: IntersectionObserver; targets: Set<Element> };
const observers = new Set<Observed>();

class FakeIntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds = [0];
  private readonly entry: Observed;
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.rootMargin = options?.rootMargin ?? "0px";
    this.entry = { callback, observer: this as unknown as IntersectionObserver, targets: new Set() };
    observers.add(this.entry);
  }
  observe(target: Element) {
    this.entry.targets.add(target);
  }
  unobserve(target: Element) {
    this.entry.targets.delete(target);
  }
  disconnect() {
    this.entry.targets.clear();
    observers.delete(this.entry);
  }
  takeRecords() {
    return [];
  }
}

/** Every observed element reports that it scrolled into view. */
export function revealAll(): void {
  revealWhere(() => true);
}

/** Observed elements report in view when `inView` says so, out of view otherwise. */
export function revealWhere(inView: (target: Element) => boolean): void {
  for (const { callback, observer, targets } of [...observers]) {
    const entries = [...targets].map((target) => {
      const hit = inView(target);
      return { target, isIntersecting: hit, intersectionRatio: hit ? 1 : 0 } as unknown as IntersectionObserverEntry;
    });
    if (entries.length > 0) callback(entries, observer);
  }
}

/** Give an element the layout box jsdom never computes. */
export function setRect(el: Element, rect: Partial<DOMRect>): void {
  const full = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect };
  el.getBoundingClientRect = () => ({ ...full, toJSON: () => full }) as DOMRect;
}

/** Set a scroll container's (or the document's) scroll geometry. */
export function setScrollBox(el: Element, box: { scrollTop?: number; scrollHeight?: number; clientHeight?: number }): void {
  for (const [key, value] of Object.entries(box)) Object.defineProperty(el, key, { configurable: true, writable: true, value });
}

/** The elements some IntersectionObserver is watching, in observation order. */
export function observedElements(): Element[] {
  return [...observers].flatMap((o) => [...o.targets]);
}

export function setAnimateSupport(supported: boolean): void {
  if (supported) {
    Object.defineProperty(Element.prototype, "animate", { configurable: true, writable: true, value: () => ({ cancel() {}, finished: Promise.resolve() }) });
  } else {
    delete (Element.prototype as { animate?: unknown }).animate;
  }
}

export function installBrowserFakes(): void {
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });
  Object.defineProperty(window, "IntersectionObserver", { configurable: true, writable: true, value: FakeIntersectionObserver });
  setAnimateSupport(true);
}

export function resetBrowserFakes(): void {
  for (const key of [...media.keys()]) setMedia(key, false);
  media.clear();
  observers.clear();
  installBrowserFakes();
}
