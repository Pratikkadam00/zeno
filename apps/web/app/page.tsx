import {
  Bell,
  Bot,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const trustSignals = [
  "No bank login required",
  "Renewal warnings before charge day",
  "Cancellation routes in one tap",
  "Encrypted local-first vault"
];

const subscriptions = [
  { name: "Adobe Creative Cloud", amount: "$54.99", date: "May 27", badge: "3 days", urgent: "red" },
  { name: "Midjourney", amount: "$10.00", date: "May 31", badge: "7 days", urgent: "amber" },
  { name: "Netflix", amount: "$15.49", date: "Jun 4", badge: "11 days", urgent: "neutral" },
  { name: "Disney+ Family", amount: "$13.99", date: "Jun 8", badge: "15 days", urgent: "neutral" }
];

const dashboardStats: Array<{ label: string; value: string; icon: LucideIcon }> = [
  { label: "Monthly spend", value: "$107.46", icon: CreditCard },
  { label: "Tracked", value: "5", icon: Radar },
  { label: "Next renewal", value: "3 days", icon: CalendarClock }
];

const logos = ["Netflix", "Spotify", "Adobe", "Notion", "ChatGPT", "Figma", "Hulu", "Canva"];

const features = [
  {
    icon: Radar,
    title: "Automatic subscription radar",
    description: "Find recurring charges from CSV imports and receipt patterns without giving Zeno your banking credentials."
  },
  {
    icon: Bell,
    title: "Renewal warnings",
    description: "Get the right alert at seven days, three days, and charge day so cancellation windows do not slip by."
  },
  {
    icon: X,
    title: "One-tap cancel routes",
    description: "Jump straight to the right cancellation page or guide for the services you already pay for."
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    description: "Subscription records stay local-first with encrypted storage and clean export/delete controls."
  },
  {
    icon: Sparkles,
    title: "Spend coach",
    description: "Spot duplicate tools, annual savings opportunities, and subscriptions that no longer earn their keep."
  },
  {
    icon: WalletCards,
    title: "Family-ready view",
    description: "See shared costs, owners, reminders, and renewal pressure without turning the app into accounting software."
  }
];

const steps = [
  {
    step: "01",
    title: "Import or add",
    description: "Start with a bank CSV, receipt inbox scan, or a manual subscription. Raw files are parsed and discarded."
  },
  {
    step: "02",
    title: "Review the radar",
    description: "Zeno groups merchants, cadence, renewal dates, and confidence into one clean operating view."
  },
  {
    step: "03",
    title: "Act before renewal",
    description: "Keep, downgrade, pause, or cancel with reminders and direct paths ready before the next charge."
  }
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    description: "For getting renewals out of your head.",
    cta: "Start free",
    features: [
      ["Track 5 subscriptions", true],
      ["Day-of reminders", true],
      ["CSV import", true],
      ["AI spend coach", false],
      ["Family vault", false]
    ]
  },
  {
    name: "Pro",
    price: "$4",
    description: "For people who want every renewal under control.",
    cta: "Get Pro",
    featured: true,
    features: [
      ["Unlimited subscriptions", true],
      ["7-day and 3-day alerts", true],
      ["Cancellation guide routing", true],
      ["AI spend coach", true],
      ["Family vault", false]
    ]
  },
  {
    name: "Family",
    price: "$8",
    description: "For households sharing streaming, tools, and app costs.",
    cta: "Start family",
    features: [
      ["Unlimited subscriptions", true],
      ["Shared owners", true],
      ["Family vault", true],
      ["Spend summaries", true],
      ["Business exports", false]
    ]
  }
];

const testimonials = [
  {
    initials: "MR",
    quote: "Zeno caught three overlapping AI subscriptions before renewal week. The cancellation links saved more time than the reminders.",
    name: "Maya R.",
    role: "Product lead"
  },
  {
    initials: "DK",
    quote: "It feels calmer than a budgeting app. I only open it when a renewal needs a decision, which is exactly the point.",
    name: "Dev K.",
    role: "Founder"
  },
  {
    initials: "AL",
    quote: "The family view made streaming and kids app renewals finally visible without another shared spreadsheet.",
    name: "Anika L.",
    role: "Parent and designer"
  }
];

const faqs = [
  {
    question: "Do I need to connect my bank?",
    answer: "No. Zeno can start from manual entries, bank CSV files, and receipt-based detection without requiring bank login."
  },
  {
    question: "Does Zeno cancel subscriptions for me?",
    answer: "Zeno gets you to the correct cancellation path quickly. Human confirmation remains with you."
  },
  {
    question: "Where is my subscription data stored?",
    answer: "The app is designed local-first, with encrypted storage for core subscription records."
  },
  {
    question: "Can I track annual plans?",
    answer: "Yes. Monthly, annual, trial, and unknown cadences are supported in the subscription model."
  },
  {
    question: "Is there a family plan?",
    answer: "Yes. Family Vault is planned for shared owners, grouped subscriptions, and household spend views."
  },
  {
    question: "Can I use Zeno on the web?",
    answer: "The mobile app is primary. Web guides and account surfaces are available for cancellation and SEO workflows."
  }
];

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Zeno",
  applicationCategory: "FinanceApplication",
  operatingSystem: "iOS, Android, Web",
  description:
    "Subscription manager that automatically finds every subscription, warns you before renewals, and gets you to cancel in one tap. No bank login required.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer
    }
  }))
};

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const classes = {
    red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    neutral: "bg-[var(--ink-7)] text-[var(--ink-3)]"
  }[tone];

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

function MiniPreview({ theme }: { theme: "pulse" | "clarity" | "command" }) {
  const config = {
    pulse: {
      shell: "bg-[#09090B] text-white",
      card: "bg-white/5 border-white/10 rounded-[20px]",
      accent: "bg-[#7C3AED]",
      line: "bg-[#F43F5E]"
    },
    clarity: {
      shell: "bg-[#F8FAFC] text-[#0A0A0B]",
      card: "bg-[#FFFFFF] border-[#E4E4E7] rounded-[12px]",
      accent: "bg-[#2563EB]",
      line: "bg-[#0D9488]"
    },
    command: {
      shell: "bg-[#0F172A] text-white",
      card: "bg-[#1E293B] border-[#334155] rounded-[4px]",
      accent: "bg-[#15803D]",
      line: "bg-[#D97706]"
    }
  }[theme];

  return (
    <div className={`mt-6 rounded-[var(--radius)] p-3 ${config.shell}`}>
      <div className={`border p-3 ${config.card}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-2 w-20 rounded-full bg-current/25" />
            <div className="mt-2 h-5 w-24 rounded-full bg-current/85" />
          </div>
          <div className={`size-8 rounded-full ${config.accent}`} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className={`h-12 border p-2 ${config.card}`}>
            <div className={`h-1.5 w-10 rounded-full ${config.line}`} />
            <div className="mt-2 h-3 w-14 rounded-full bg-current/70" />
          </div>
          <div className={`h-12 border p-2 ${config.card}`}>
            <div className={`h-1.5 w-8 rounded-full ${config.accent}`} />
            <div className="mt-2 h-3 w-10 rounded-full bg-current/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--ink-8)] text-[var(--ink)]">
      <header className="sticky top-0 z-50 h-14 border-b border-[var(--ink-6)] bg-[var(--ink-8)]/80 backdrop-blur-xl">
        <div className="mx-auto grid h-full max-w-7xl grid-cols-2 items-center px-5 md:grid-cols-[1fr_auto_1fr]">
          <a href="#" className="text-xl font-semibold tracking-[-0.02em]">
            zeno<span className="text-[var(--blue)]">.</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--ink-3)] md:flex">
            <a href="#features" className="hover:text-[var(--ink)]">Features</a>
            <a href="#themes" className="hover:text-[var(--ink)]">Themes</a>
            <a href="#pricing" className="hover:text-[var(--ink)]">Pricing</a>
            <a href="#faq" className="hover:text-[var(--ink)]">FAQ</a>
          </nav>
          <div className="flex justify-end gap-2">
            <a href="#download" className="hidden h-9 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--ink-2)] hover:bg-[var(--ink-7)] sm:inline-flex">
              Sign in
            </a>
            <a href="#download" className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[var(--ink)] px-2.5 text-sm font-medium text-[var(--ink-8)] sm:px-3">
              Get Zeno
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-20 md:pb-20 md:pt-28">
        <div className="max-w-4xl">
          <div className="mb-7 flex items-center gap-3 text-sm font-medium text-[var(--ink-3)]">
            <span className="h-px w-10 bg-[var(--ink-5)]" />
            Subscription control without bank login
          </div>
          <h1 className="max-w-5xl break-words text-[2.15rem] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl md:text-7xl lg:text-8xl">
            Know what you pay.
            <em className="mt-2 block not-italic text-[var(--ink-4)]">Control what you keep.</em>
          </h1>
          <p className="mt-7 max-w-2xl break-words text-lg font-light leading-8 text-[var(--ink-2)] md:text-xl">
            Zeno finds recurring subscriptions, warns you before renewal day, and gets you to cancellation paths before another charge lands.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#download" className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--blue)] px-5 text-sm font-medium text-white sm:w-auto">
              Download the app
            </a>
            <a href="#demo" className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] border border-[var(--ink-6)] bg-card px-5 text-sm font-medium text-[var(--ink)] sm:w-auto">
              See the dashboard
            </a>
          </div>
          <div className="mt-9 grid gap-3 md:grid-cols-4">
            {trustSignals.map((signal) => (
              <div key={signal} className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                </span>
                {signal}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-5 pb-16 md:pb-24">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--ink-6)] bg-card shadow-[0_30px_80px_rgba(10,10,11,0.10)]">
          <div className="flex h-12 items-center justify-between border-b border-[var(--ink-6)] bg-[var(--ink-7)] px-4">
            <div className="flex gap-2">
              <span className="size-3 rounded-full bg-[#FF5F57]" />
              <span className="size-3 rounded-full bg-[#FEBC2E]" />
              <span className="size-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="hidden rounded-full border border-[var(--ink-6)] bg-card px-4 py-1 text-xs text-[var(--ink-3)] md:block">
              app.zeno.money/dashboard
            </div>
            <div className="w-14" />
          </div>
          <div className="grid min-h-[620px] overflow-hidden bg-[var(--ink-8)] md:grid-cols-[220px_1fr]">
            <aside className="hidden border-r border-[var(--ink-6)] bg-card p-5 md:block">
              <div className="text-lg font-semibold">zeno<span className="text-[var(--blue)]">.</span></div>
              <div className="mt-8 space-y-2 text-sm text-[var(--ink-3)]">
                {["Radar", "Calendar", "Coach", "Cancel", "Settings"].map((item, index) => (
                  <div key={item} className={`rounded-[var(--radius-sm)] px-3 py-2 ${index === 0 ? "bg-[var(--ink)] text-[var(--ink-8)]" : ""}`}>
                    {item}
                  </div>
                ))}
              </div>
            </aside>
            <div className="p-5 md:p-8">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-medium text-[var(--ink-3)]">Good morning</p>
                  <h2 className="mt-2 text-5xl font-semibold tracking-[-0.04em]">$107.46</h2>
                  <p className="mt-1 text-sm text-[var(--ink-3)]">across 5 subscriptions</p>
                </div>
                <div className="inline-flex rounded-full border border-[var(--ink-6)] bg-card p-1 text-sm font-medium text-[var(--ink-3)]">
                  <span className="rounded-full bg-[var(--blue)] px-4 py-2 text-white">Clarity</span>
                  <span className="px-4 py-2">Pulse</span>
                  <span className="px-4 py-2">Command</span>
                </div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {dashboardStats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-[var(--radius)] border border-[var(--ink-6)] bg-card p-5">
                    <Icon className="text-[var(--blue)]" size={19} aria-hidden="true" />
                    <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--ink-6)] bg-card p-5">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-3)]">Upcoming renewals</p>
                  <a href="#download" className="text-sm font-medium text-[var(--blue)]">Open calendar</a>
                </div>
                <div>
                  {subscriptions.map((sub, index) => (
                    <div key={sub.name} className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${index < subscriptions.length - 1 ? "border-b border-[var(--ink-6)]" : ""}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--ink-8)]">
                          {sub.name[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{sub.name}</p>
                          <p className="text-sm text-[var(--ink-3)]">{sub.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                        <p className="font-semibold">{sub.amount}</p>
                        <Badge tone={sub.urgent}>{sub.badge}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--ink-6)] bg-card">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <p className="text-sm font-medium text-[var(--ink-3)]">Used by people paying for</p>
          <div className="mt-5 grid grid-cols-2 gap-5 text-lg font-medium text-[var(--ink-4)] md:grid-cols-4 lg:grid-cols-8">
            {logos.map((logo) => <span key={logo}>{logo}</span>)}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-medium text-[var(--blue)]">Features</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Everything before the charge.</h2>
        </div>
        <div className="grid border-l border-t border-[var(--ink-6)] md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="border-b border-r border-[var(--ink-6)] bg-card p-7">
                <Icon size={22} className="text-[var(--blue)]" aria-hidden="true" />
                <h3 className="mt-6 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-[var(--ink-3)]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid border border-[var(--ink-6)] bg-card md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.step} className={`p-7 ${index < steps.length - 1 ? "border-b border-[var(--ink-6)] md:border-b-0 md:border-r" : ""}`}>
              <p className="text-sm font-medium text-[var(--ink-4)]">{step.step}</p>
              <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">{step.title}</h3>
              <p className="mt-3 leading-7 text-[var(--ink-3)]">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="themes" className="mx-auto max-w-7xl px-5 pb-20">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-[var(--blue)]">Themes</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Three ways to see money.</h2>
          </div>
          <p className="max-w-md leading-7 text-[var(--ink-3)]">Pulse for speed, Clarity for calm, Command for dense control.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Pulse", "For quick decisions and renewal pressure.", "pulse"],
            ["Clarity", "For a calm personal finance command center.", "clarity"],
            ["Command", "For power users who prefer dense controls.", "command"]
          ].map(([name, description, theme]) => (
            <div key={name} className="rounded-[var(--radius-lg)] border border-[var(--ink-6)] bg-card p-5">
              <h3 className="text-xl font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">{description}</p>
              <MiniPreview theme={theme as "pulse" | "clarity" | "command"} />
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 pb-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-medium text-[var(--blue)]">Pricing</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Start free. Upgrade when it saves you money.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {pricing.map((plan) => (
            <div key={plan.name} className={`rounded-[var(--radius-lg)] bg-card p-6 ${plan.featured ? "border-[1.5px] border-[var(--ink)]" : "border border-[var(--ink-6)]"}`}>
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 min-h-12 leading-6 text-[var(--ink-3)]">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-semibold tracking-[-0.05em]">{plan.price}</span>
                <span className="pb-2 text-[var(--ink-3)]">/mo</span>
              </div>
              <a href="#download" className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] text-sm font-medium ${plan.featured ? "bg-[var(--ink)] text-[var(--ink-8)]" : "border border-[var(--ink-6)] text-[var(--ink)]"}`}>
                {plan.cta}
              </a>
              <div className="mt-6 space-y-3 text-sm">
                {plan.features.map(([feature, available]) => (
                  <div key={String(feature)} className="flex items-center gap-3">
                    <span className={available ? "text-[var(--blue)]" : "text-[var(--ink-4)]"}>{available ? "✓" : "–"}</span>
                    <span className={available ? "text-[var(--ink-2)]" : "text-[var(--ink-4)]"}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.name} className="rounded-[var(--radius-lg)] border border-[var(--ink-6)] bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--ink-8)]">{item.initials}</div>
              <p className="mt-6 leading-7 text-[var(--ink-2)]">“{item.quote}”</p>
              <div className="mt-6">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[var(--ink-3)]">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-medium text-[var(--blue)]">FAQ</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Questions before you hand Zeno a renewal list.</h2>
          <p className="mt-5 leading-7 text-[var(--ink-3)]">Short answers for privacy, cancellation, and platform support.</p>
        </div>
        <div className="divide-y divide-[var(--ink-6)] border-y border-[var(--ink-6)]">
          {faqs.map((faq) => (
            <div key={faq.question} className="py-5">
              <h3 className="font-semibold">{faq.question}</h3>
              <p className="mt-2 leading-7 text-[var(--ink-3)]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="download" className="bg-[var(--ink)] px-5 py-20 text-[var(--ink-8)]">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-medium text-[var(--ink-4)]">Download</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">Know what renews before it renews.</h2>
          <div className="mt-9 grid gap-3 md:grid-cols-3 md:px-32">
            {["App Store", "Google Play", "Mac App"].map((store) => (
              <a key={store} href="#" className="rounded-[var(--radius)] border border-white/15 bg-[var(--background)] px-5 py-4 text-left text-[var(--ink)] dark:border-black/15">
                <p className="text-xs text-[var(--ink-3)]">Download on</p>
                <p className="font-semibold">{store}</p>
              </a>
            ))}
          </div>
          <a href="#demo" className="mt-6 inline-flex text-sm font-medium text-[var(--ink-4)] hover:text-[var(--ink-8)]">
            Continue with web preview <ChevronRight size={16} className="ml-1" aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="bg-card px-5 pt-14">
        <div className="mx-auto grid max-w-7xl gap-8 pb-12 md:grid-cols-4">
          <div>
            <p className="text-xl font-semibold">zeno<span className="text-[var(--blue)]">.</span></p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--ink-3)]">Know what you pay. Control what you keep.</p>
          </div>
          {[
            ["Product", "Features", "Themes", "Pricing", "Download"],
            ["Company", "About", "Careers", "Press", "Partners"],
            ["Resources", "Cancel guides", "Security", "Developers", "Status"]
          ].map(([title, ...items]) => (
            <div key={title}>
              <p className="font-semibold">{title}</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--ink-3)]">
                {items.map((item) => <a key={item} href="#" className="block hover:text-[var(--ink)]">{item}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t border-[var(--ink-6)] py-5 text-sm text-[var(--ink-3)] md:flex-row">
          <p>© 2026 Zeno Money, Inc.</p>
          <div className="flex gap-5">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />
    </main>
  );
}
