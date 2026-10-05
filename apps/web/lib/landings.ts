import { isGeneralCancelGuide, serviceRecords, services } from "@zeno/service-catalog";

// The four landing pages (SEO.md §5.1 "money pages", §6.1 formula): one buying
// intent each. Copy lives here as data so the visible FAQ and its FAQPage schema
// are the same text, and landings.test.tsx can count words and check claims.
//
// Every claim below was read in the code before it was written (2026-10-05):
// the 7/3/day-of renewal ladder and the 2/1/0-day trial ladder
// (apps/mobile/src/notifications/notificationService.ts), a trial reminder's tap
// opening that subscription's cancel flow (notificationHandlers.ts), Gmail read-only
// with several accounts (discovery/emailScanner.ts), store receipts named by app
// (packages/shared extractStoreAppName), "pending" until the renewal passes clean
// (domain.ts, subscription-store.tsx), the free monthly cap and the Pro-only category
// budgets and envelopes (apps/mobile/app/budget.tsx), the prices (the homepage bill).
// Email scanning does not detect trials, so the trial page says you add them.

const SERVICE_COUNT = services.length;
const RESEARCHED_COUNT = serviceRecords.filter((s) => !isGeneralCancelGuide(s.name, s.cancellationGuideSteps)).length;

export type LandingSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  ordered?: boolean;
  after?: string[];
};

export type Landing = {
  path: string;
  /** Search title, without the brand (pageMetadata adds it). */
  metaTitle: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  sections: LandingSection[];
  faqs: Array<{ q: string; a: string }>;
  related: Array<{ href: string; label: string }>;
  cta: string;
};

export const LANDINGS: Landing[] = [
  {
    path: "/subscription-tracker",
    metaTitle: "Subscription tracker app with no bank login",
    description:
      "Zeno lists every subscription you pay for, from receipts and statements you control, and warns you before each renewal. No bank login required. Free for 10.",
    eyebrow: "Subscription tracker",
    h1: "A subscription tracker that starts from your receipts, not your bank login",
    lead:
      "Most people can name four or five of their subscriptions. The rest renew without a sound, a few dollars at a time. Zeno builds the full list from the receipts in your inbox and the statements you download, then tells you before each one charges.",
    sections: [
      {
        heading: "Why the list in your head is always short",
        paragraphs: [
          "Subscriptions are built to be forgotten. You sign up once, the card is saved, and after that the only sign the thing exists is a line on a statement you skim. Yearly plans are worse. They appear once a year, usually long after you stopped using them.",
          "A tracker fixes this by putting everything in one place, with the price and the next date it charges. That part is simple. The hard part is getting the list complete without giving up an evening, and without handing your bank password to another company."
        ]
      },
      {
        heading: "How Zeno builds the list",
        ordered: true,
        list: [
          "Connect a Gmail account, read-only, and tap scan. Zeno looks for billing receipts and renewal notices and reads them on your phone. You can connect more than one account.",
          "Or import a statement. Download a CSV from your bank's website and open it in Zeno. Any bank that exports CSV will do.",
          "Add the rest by hand. A gym membership paid at the front desk still belongs on the list."
        ],
        after: [
          `Each charge is matched against a catalogue of ${SERVICE_COUNT} services, which fills in the usual price, the billing cycle and a cancellation guide. You review the list before anything is saved. Nothing runs in the background: a scan happens when you tap it, and not otherwise.`
        ]
      },
      {
        heading: "What you get once the list exists",
        list: [
          "One monthly total for everything you pay for, with each subscription's price and billing cycle beside it.",
          "A reminder seven days before each renewal, three days before, and on the morning it charges, each with the amount due. Quiet hours are respected.",
          "A calendar of what renews when, so an expensive week is never a surprise.",
          "A short path to cancelling: the guide for that service, with its known traps marked."
        ]
      },
      {
        heading: "Why not just link your bank?",
        paragraphs: [
          "Bank-linked trackers can be quicker to set up. They connect to your accounts through a data aggregator such as Plaid, which means signing in to your bank through that service and giving it ongoing access to your transactions. Plenty of people are comfortable with that. Plenty aren't, and those connections also tend to break when a bank changes its sign-in.",
          "Zeno goes the other way. It works from receipts and statements you choose to give it, keeps your subscription list encrypted on your phone, and never asks for your bank credentials. No bank login required."
        ]
      },
      {
        heading: "Compared with a spreadsheet",
        paragraphs: [
          "A spreadsheet is free and private, and if you keep it up, it works. The trouble is that almost nobody keeps it up. It doesn't remind you before a renewal, and it can't tell you whether a cancellation actually stopped the charge. Zeno does both, and the list is already filled in."
        ]
      },
      {
        heading: "What it costs",
        paragraphs: [
          "The free plan tracks up to 10 subscriptions, with every reminder and cancellation guide included, and it stays free. Pro is $3.99 a month or $29.99 a year: it removes the limit and adds category budgets and envelope budgeting. If you'd rather not add another subscription to your list, Lifetime is a single payment of $79.99."
        ]
      }
    ],
    faqs: [
      {
        q: "Do I need to connect my bank account?",
        a: "No. Zeno works from email receipts, statement files you import, and subscriptions you add yourself. It never asks for your bank login."
      },
      {
        q: "Which email accounts can Zeno scan?",
        a: "Gmail, connected read-only. You can connect more than one Gmail account. For anything billed elsewhere, import a statement or add the subscription by hand."
      },
      {
        q: "Will it find subscriptions billed through the App Store or Google Play?",
        a: "Often, yes. When a receipt comes from Apple or Google, Zeno reads the app's name from it, so a streaming plan billed by Apple shows up under the streaming service's name rather than as Apple."
      },
      {
        q: "Where is my subscription list stored?",
        a: "On your phone, encrypted. You can lock the app with a PIN, and with biometrics where your phone supports them."
      },
      {
        q: "Can I download the app today?",
        a: "Not yet. We're finishing the iOS and Android apps now. Join the waitlist on this page and we'll email you when it's ready."
      }
    ],
    related: [
      { href: "/blog/how-to-find-all-your-subscriptions", label: "How to find every subscription you're paying for" },
      { href: "/blog/the-20-minute-subscription-audit", label: "A 20-minute subscription audit" },
      { href: "/cancel", label: `Cancellation guides for ${SERVICE_COUNT} services` }
    ],
    cta: "Put every subscription you pay for on one list"
  },
  {
    path: "/cancel-subscriptions",
    metaTitle: "Cancel subscriptions you no longer use",
    description: `Guides to cancel ${SERVICE_COUNT} subscriptions, traps marked. Zeno then checks the receipts and statements you scan or import to confirm the charge stopped.`,
    eyebrow: "Cancel subscriptions",
    h1: "Cancel the subscriptions you don't use, and make sure they stay cancelled",
    lead:
      "Cancelling should take a minute. It often takes twenty, and sometimes the charge comes back anyway. Zeno gives you the steps for each service, points out the tricks on the way out, and keeps checking until the next billing date passes without a charge.",
    sections: [
      {
        heading: "Why the way out is longer than the way in",
        paragraphs: [
          "Signing up is one screen. Leaving is often several: a setting tucked under Account, a short survey, a discount you didn't ask for, a suggestion to pause instead. Each step keeps a few more people paying, which is why they are there.",
          "Some subscriptions are also billed by someone else. A plan you started inside an iPhone app is cancelled in Apple's subscription settings, not in the app, and deleting the app changes nothing. That is how people end up paying for things they are sure they cancelled."
        ]
      },
      {
        heading: "How Zeno helps you cancel",
        ordered: true,
        list: [
          "Pick the subscription. Zeno opens the guide for that service, with a direct link to its cancellation page.",
          "Follow the steps. Known traps, such as a retention offer or a pause button placed where you expect cancel, are pointed out before you reach them.",
          "Mark it cancelled. Zeno records the date and keeps the subscription on your list as pending.",
          "Let the date pass. If the renewal date goes by with no new charge in the receipts or statements you scan or import, the cancellation is marked verified. If a charge appears anyway, Zeno flags it so you can follow it up."
        ]
      },
      {
        heading: `${SERVICE_COUNT} services, and how far each guide goes`,
        paragraphs: [
          `The catalogue covers ${SERVICE_COUNT} services. For ${RESEARCHED_COUNT} of them, the guide has steps written for that service. For the others, it gives the steps most services follow, a direct link to that service's own cancellation page, and a plain note that we haven't checked its exact flow yet. We would rather say so than pretend.`,
          "Every guide is free to read on this site, with or without the app."
        ]
      },
      {
        heading: "Pending, verified, or flagged",
        paragraphs: [
          "Once you mark a subscription cancelled, it stays on your list until Zeno knows how it ended. Pending means you have cancelled and the renewal date hasn't arrived. Verified means the date passed and no new charge appeared in the receipts or statements you scanned or imported. If a charge does turn up after you cancelled, Zeno flags it.",
          "A flagged charge is worth dealing with quickly. Contact the service with the date you cancelled, which Zeno has kept, along with any confirmation email, and ask for that charge back. The sooner you ask, the easier it usually is."
        ]
      },
      {
        heading: "Where to start if you're cutting costs",
        paragraphs: [
          "Begin with anything you haven't opened in three months. Then look at the yearly plans: they renew once, in one large charge, and are the easiest to miss. Zeno lists each subscription with its price and billing cycle side by side, which usually makes the order obvious."
        ]
      },
      {
        heading: "Zeno doesn't cancel on your behalf",
        paragraphs: [
          "Some apps offer to cancel subscriptions for you, which means giving them access to your accounts. Zeno doesn't do that. You make the final click yourself, and Zeno keeps track of whether it worked. It takes a minute longer, and you never have to share a password."
        ]
      },
      {
        heading: "What it costs",
        paragraphs: [
          "Cancellation guides and verification are part of the free plan, for up to 10 subscriptions. Pro, at $3.99 a month or $29.99 a year, removes the limit."
        ]
      }
    ],
    faqs: [
      {
        q: "Can Zeno cancel a subscription for me?",
        a: "No. Zeno opens the right page and walks you through it, but you confirm the cancellation yourself. That way nobody else needs access to your accounts."
      },
      {
        q: "How do I know a cancellation worked?",
        a: "Zeno waits for the next renewal date. If no new charge appears by then in the receipts or statements you scan or import, it marks the cancellation verified. If one does appear, it flags it."
      },
      {
        q: "I cancelled, but I'm still being charged. What should I do?",
        a: "First check who bills you. Subscriptions bought through the App Store or Google Play are cancelled in your phone's subscription settings. If the service bills you directly, contact it with the date you cancelled and any confirmation email, and ask for the charge to be refunded."
      },
      {
        q: "Do I need the app to use the guides?",
        a: `No. All ${SERVICE_COUNT} guides are free to read at zenoapp.in/cancel.`
      }
    ],
    related: [
      { href: "/cancel", label: `Cancellation guides for ${SERVICE_COUNT} services` },
      { href: "/blog/why-cancelling-a-subscription-is-harder-than-starting-one", label: "Why cancelling is harder than starting a subscription" },
      { href: "/blog/the-20-minute-subscription-audit", label: "A 20-minute subscription audit" }
    ],
    cta: "Cancel what you don't use, and know it stayed cancelled"
  },
  {
    path: "/free-trial-reminders",
    metaTitle: "Free trial reminders before you're charged",
    description:
      "Zeno keeps each free trial's end date and reminds you two days before, the day before, and on the day it ends, with the price. No bank login required.",
    eyebrow: "Free trial reminders",
    h1: "Free trial reminders that arrive before the charge, not after",
    lead:
      "A free trial turns into a paid plan on a date you were shown once, in small print. Zeno keeps that date for you and reminds you three times before it arrives, each time with the price you're about to pay.",
    sections: [
      {
        heading: "A trial is built to convert",
        paragraphs: [
          "A free trial is really a payment that starts later. Your card goes on file when you sign up, paying is the default, and the end date is easy to lose. The service doesn't need you to love it. It only needs you to forget.",
          "Most people who pay for a trial they didn't want meant to cancel. They didn't have the date in front of them at the right moment."
        ]
      },
      {
        heading: "How Zeno handles a trial",
        ordered: true,
        list: [
          "Add the trial when you start it: the service, the day it ends, and the price it turns into. It takes a few seconds.",
          "Get three reminders: two days before the trial ends, the day before, and on the day itself. Each one shows what you'll be charged.",
          "Tap a reminder to cancel. It opens the cancellation flow for that service, with its guide."
        ],
        after: [
          "Trials that are about to end appear at the top of your dashboard, soonest first, with a countdown in days."
        ]
      },
      {
        heading: "What counts as a trial",
        paragraphs: [
          "Anything that starts free and turns into a payment by itself: a first month of a streaming service, a software trial that asked for a card, a free week of a fitness app. An introductory price that goes up after a few months works the same way, and you can add it as a trial that turns into the full price."
        ]
      },
      {
        heading: "Why these three days",
        paragraphs: [
          "Two days out gives you time to decide without rushing, and to find a password for an account you haven't opened since you signed up. The day before is the reminder most people act on. The one on the day is the last chance, and it says plainly what will be charged if you do nothing."
        ]
      },
      {
        heading: "If you decide to keep it",
        paragraphs: [
          "Sometimes the trial earns its place. Then edit it into a regular subscription with its new price and billing cycle, and Zeno will remind you before each renewal like everything else on your list."
        ]
      },
      {
        heading: "Three habits that work well with reminders",
        list: [
          "If the service lets you keep access until the trial ends after cancelling, cancel on the first day. Its cancellation page usually says whether it does.",
          "Note who bills you. A trial started inside a phone app is usually billed by Apple or Google, and has to be cancelled in your phone's subscription settings.",
          "Check what it converts to. Some trials become a yearly plan, which turns a small slip into a large charge."
        ],
        after: ["There is more on each of these in our longer guide to free trials, linked below."]
      },
      {
        heading: "What it costs",
        paragraphs: [
          "Trial reminders are part of the free plan, which covers up to 10 subscriptions and trials together. Pro, at $3.99 a month or $29.99 a year, removes the limit."
        ]
      }
    ],
    faqs: [
      {
        q: "How many reminders do I get for a free trial?",
        a: "Three: two days before the trial ends, the day before, and on the day it ends. You can switch any of them off in settings, and quiet hours are respected."
      },
      {
        q: "Does Zeno find my free trials on its own?",
        a: "No. You add a trial when you start it. It takes a few seconds, and it means Zeno doesn't need access to your accounts to know about it."
      },
      {
        q: "What if I don't know the exact end date?",
        a: "Look in the sign-up confirmation email, or the subscription page in your account settings for that service. If you can't find it, count the trial length from the day you signed up and enter the day before, to be safe."
      },
      {
        q: "Can I see all my trials in one place?",
        a: "Yes. Trials sit on your list with everything else, marked as trials, and the ones ending soonest are shown at the top of your dashboard with a countdown."
      },
      {
        q: "Does it work for trials started on the App Store or Google Play?",
        a: "Yes, add them the same way. Remember that those trials are cancelled in your phone's subscription settings, not inside the app."
      }
    ],
    related: [
      { href: "/blog/free-trials-how-to-stop-paying-for-the-ones-you-forgot", label: "Free trials: stop paying for the ones you forgot" },
      { href: "/cancel", label: `Cancellation guides for ${SERVICE_COUNT} services` },
      { href: "/subscription-tracker", label: "A subscription tracker with no bank login" }
    ],
    cta: "Get a reminder before every free trial charges"
  },
  {
    path: "/budgeting",
    metaTitle: "A budget for people who hate budgeting apps",
    description:
      "Set one monthly cap, built from what renews anyway. Zeno shows what's been charged, what's still to come, and where the month will land. No bank login required.",
    eyebrow: "Budgeting",
    h1: "Budgeting for people who gave up on budgeting apps",
    lead:
      "Most budgeting apps want every coffee sorted into a category. Zeno starts with the money that leaves on a schedule, your subscriptions and recurring bills, and gives you one monthly number to stay under.",
    sections: [
      {
        heading: "Why most budgets don't last",
        paragraphs: [
          "The usual budgeting app asks for a bank connection, pulls in hundreds of transactions, and gives you the job of sorting them. It works for a week or two. Then the categories drift, the sync breaks, and the app becomes one more thing you feel bad about opening.",
          "There is a smaller job that is easier to keep up: knowing how much of the month is already spoken for before it starts. Recurring charges are the part of that you can change with a single decision, so they are a good place to begin."
        ]
      },
      {
        heading: "How it works in Zeno",
        ordered: true,
        list: [
          "Set a monthly cap. Zeno suggests one from your renewals, or you type your own. Nothing needs importing to start.",
          "Watch three numbers: what has been charged so far this month, what is still to renew, and where the month is forecast to end.",
          "Read last month's recap, which shows how your spending tracked against the cap, so the next cap can be a realistic one.",
          "Add your income if you want to, and see your recurring spend as a share of it."
        ]
      },
      {
        heading: "An example month",
        paragraphs: [
          "Say your renewals come to $86 a month: streaming, music, cloud storage, a gym and a few apps. You set a cap of $90. Halfway through the month, Zeno shows $51 charged, $35 still to renew, and a forecast of $86, inside the cap with a little room.",
          "Now say a yearly plan you had forgotten renews this month at $60. Because it falls in this month, it is already in the forecast, which reads $146 against your $90 cap well before the charge lands. That is the moment to decide whether to keep it, not after."
        ]
      },
      {
        heading: "More control with Pro",
        paragraphs: [
          "Pro adds category budgets, so streaming and software can each have their own limit, and envelope budgeting, for people who like to give every dollar a job before the month begins. You fund an envelope at the start of the month and log what you spend from it, with nothing to import. Both are optional. The monthly cap works on its own and stays free."
        ]
      },
      {
        heading: "Compared with full budgeting apps",
        paragraphs: [
          "Apps like YNAB and Monarch Money are built for complete budgeting, transaction by transaction, and they are good at it. Monarch connects to your bank accounts to bring transactions in. YNAB costs $109 a year.",
          "Zeno is narrower on purpose. It tracks what renews, budgets around it, and works without a bank connection. If you want every purchase in a category, a full budgeting app is the better tool. If you want to stop being surprised by charges you already agreed to, Zeno is built for that."
        ]
      },
      {
        heading: "What it costs",
        paragraphs: [
          "The monthly cap, the forecast and the recap are free, for up to 10 subscriptions. Pro is $3.99 a month or $29.99 a year, or a single $79.99 payment with Lifetime, and adds category budgets, envelope budgeting and unlimited subscriptions."
        ]
      }
    ],
    faqs: [
      {
        q: "Do I have to connect my bank to budget with Zeno?",
        a: "No. The cap and the forecast are built from the subscriptions and bills you track. You can import a statement CSV if you want past charges included."
      },
      {
        q: "Does Zeno track every purchase?",
        a: "No. It tracks recurring charges: subscriptions, memberships and bills that renew. For day-to-day spending, a full budgeting app or a notebook will serve you better."
      },
      {
        q: "What's free, and what needs Pro?",
        a: "The monthly cap, the forecast and last month's recap are free. Category budgets and envelope budgeting are part of Pro, at $3.99 a month or $29.99 a year, or $79.99 once with Lifetime."
      },
      {
        q: "Can I change my cap later?",
        a: "Yes, at any time. Last month's recap is there to help: if you went over, either raise the cap to something honest or cancel a subscription, rather than keeping a number you will never hit."
      },
      {
        q: "Can my household use it together?",
        a: "Yes, with the Family plan: $6.99 a month for up to five people. Members see the household's totals, never each other's lists."
      }
    ],
    related: [
      { href: "/blog/the-20-minute-subscription-audit", label: "A 20-minute subscription audit" },
      { href: "/compare/budget-app-no-bank-sync", label: "A budget app that doesn't connect to your bank" },
      { href: "/subscription-tracker", label: "A subscription tracker with no bank login" }
    ],
    cta: "Budget around the charges you already know are coming"
  }
];

export function findLanding(path: string): Landing {
  const landing = LANDINGS.find((l) => l.path === path);
  if (!landing) throw new Error(`No landing page for ${path}`);
  return landing;
}

/** Every word a visitor reads on the page (headings, body, FAQ), for the word count. */
export function landingText(l: Landing): string {
  return [
    l.h1,
    l.lead,
    ...l.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.list ?? []), ...(s.after ?? [])]),
    ...l.faqs.flatMap((f) => [f.q, f.a]),
    l.cta
  ].join(" ");
}
