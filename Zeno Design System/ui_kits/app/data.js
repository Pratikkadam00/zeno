/* Sample data for the Zeno app UI kit (redesigned IA).
   Statuses: active · trial · paused · pending (cancel pending verification)
   · cancelled (verified) · attention (still being charged after cancel). */
window.ZENO = {
  subscriptions: [
    { id: "netflix", name: "Netflix",      color: "#E50914", category: "Entertainment", cat: "violet", amount: 15.99, cadence: "mo", next: "Jun 28", status: "active",
      history: [["Jun 28",15.99],["May 28",15.99],["Apr 28",13.99],["Mar 28",13.99],["Feb 28",13.99],["Jan 28",13.99]], priceHike: { from: 13.99, to: 15.99 } },
    { id: "spotify", name: "Spotify",      color: "#1DB954", category: "Music",          cat: "coral",  amount: 10.99, cadence: "mo", next: "Jul 2",  status: "active",
      history: [["Jun 02",10.99],["May 02",10.99],["Apr 02",10.99],["Mar 02",10.99]] },
    { id: "chatgpt", name: "ChatGPT Plus", color: "#10A37F", category: "Productivity",   cat: "blue",   amount: 20.00, cadence: "mo", next: "Jul 4",  status: "active",
      history: [["Jun 04",20.00],["May 04",20.00]] },
    { id: "icloud",  name: "iCloud+",      color: "#3B82F6", category: "Utilities",      cat: "amber",  amount: 2.99,  cadence: "mo", next: "Jul 5",  status: "active",
      history: [["Jun 05",2.99],["May 05",2.99],["Apr 05",2.99],["Mar 05",2.99],["Feb 05",2.99]] },
    { id: "figma",   name: "Figma",        color: "#A259FF", category: "Productivity",   cat: "blue",   amount: 12.00, cadence: "mo", next: "Jul 9",  status: "active", unused: true,
      history: [["Jun 09",12.00],["May 09",12.00],["Apr 09",12.00]] },
    { id: "disney",  name: "Disney+",      color: "#113CCF", category: "Entertainment", cat: "violet", amount: 13.99, cadence: "mo", next: "Jul 12", status: "trial", trialEnds: "Jul 12",
      history: [] },
    { id: "audible", name: "Audible",      color: "#F8991C", category: "Entertainment", cat: "violet", amount: 14.95, cadence: "mo", next: "—",      status: "paused",
      history: [["Apr 22",14.95],["Mar 22",14.95]] },
    { id: "hbo",     name: "Max",          color: "#0046FF", category: "Entertainment", cat: "violet", amount: 15.99, cadence: "mo", next: "Jul 14", status: "pending", cancelledOn: "Jun 20",
      history: [["Jun 14",15.99],["May 14",15.99],["Apr 14",15.99]] },
    { id: "hulu",    name: "Hulu",         color: "#1CE783", category: "Entertainment", cat: "violet", amount: 7.99,  cadence: "mo", next: "—",      status: "cancelled", cancelledOn: "May 30",
      history: [["May 16",7.99],["Apr 16",7.99],["Mar 16",7.99]] },
    { id: "adobe",   name: "Adobe CC",     color: "#FF0000", category: "Productivity",   cat: "blue",   amount: 54.99, cadence: "mo", next: "Jul 8",  status: "attention", cancelledOn: "Jun 8",
      history: [["Jul 08",54.99],["Jun 08",54.99],["May 08",54.99]] },
  ],
  categories: [
    { category: "Entertainment", cat: "violet", spent: 45.97 },
    { category: "Productivity",  cat: "blue",   spent: 32.00 },
    { category: "Music",         cat: "coral",  spent: 10.99 },
    { category: "Utilities",     cat: "amber",  spent: 2.99 },
  ],
  trend: [
    ["Jan", 58.95], ["Feb", 61.94], ["Mar", 61.94], ["Apr", 73.94], ["May", 78.96], ["Jun", 91.96],
  ],
  insights: [
    { id: "unused",  icon: "moon",        title: "Figma looks unused", body: "No activity in 60 days · $12.00/mo", save: 144 },
    { id: "annual",  icon: "calendar",    title: "Switch Spotify to annual", body: "Save ~16% paying yearly", save: 21 },
    { id: "dupe",    icon: "copy",        title: "Two video services overlap", body: "Netflix + Max — keep one?", save: 192 },
  ],
  freeLimit: 10,
  catalog: ["Netflix","Spotify","YouTube Premium","Disney+","ChatGPT Plus","Notion","iCloud+","Figma","Amazon Prime","Hulu","Max","Audible","Dropbox","Adobe CC","Headspace","Duolingo","NordVPN","Patreon","Twitch","Apple Music"],
};

// Active = anything currently billing (active/trial). Used for "monthly total".
window.ZENO.activeSubs = window.ZENO.subscriptions.filter(s => s.status === "active");
window.ZENO.monthlyTotal = window.ZENO.activeSubs.reduce((a, s) => a + s.amount, 0);
// Counts toward the free-tier limit: anything being tracked for billing (paused excluded).
window.ZENO.trackedCount = window.ZENO.subscriptions.filter(s => ["active","trial","pending","attention"].includes(s.status)).length;

/* ---- Budgeting ----
   committed   = recurring spend already charged this month (from renewal dates passed)
   projected   = forecast month-end recurring spend (committed + remaining renewals + trial conversions)
   The forward-looking status compares PROJECTED to the cap, not committed-so-far. */
window.ZENO.budget = {
  cap: 80,                 // user's monthly recurring budget; null = not set yet
  committed: 49.97,        // charged so far this month (Netflix, Spotify, ChatGPT, iCloud renewed)
  projected: 75.96,        // forecast month-end (adds Figma $12 + Disney trial $13.99 converting)
  income: null,            // optional monthly income; null = not entered
  // forecast: remaining renewals between now and month-end
  remaining: [
    { id: "figma",  name: "Figma",   amount: 12.00, day: "Jul 9",  color: "#A259FF" },
    { id: "disney", name: "Disney+", amount: 13.99, day: "Jul 12", color: "#113CCF", note: "trial converts" },
  ],
  categoryCaps: [
    { category: "Entertainment", cat: "violet", cap: 35, committed: 29.98, imported: 14.00 },
    { category: "Productivity",  cat: "blue",   cap: 35, committed: 32.00, imported: 0 },
    { category: "Music",         cat: "coral",  cap: 15, committed: 10.99, imported: 0 },
    { category: "Utilities",     cat: "amber",  cap: 10, committed: 2.99,  imported: 0 },
  ],
  envelopes: [
    { id: "dining", name: "Dining out", icon: "utensils",   funded: 200, spent: 145 },
    { id: "coffee", name: "Coffee",     icon: "coffee",     funded: 60,  spent: 38 },
    { id: "rides",  name: "Rideshare",  icon: "car-front",  funded: 80,  spent: 81 },
  ],
  lastImport: "Jun 14",    // freshness for CSV-enriched category spend; null = never imported
  daysLeftInMonth: 9,
  recap: { month: "May", cap: 80, actual: 74.20, prevActual: 79.40, streak: 3 },
  trend: [["Feb",61.94],["Mar",61.94],["Apr",73.94],["May",74.20],["Jun",78.96],["Jul",75.96]],
};
