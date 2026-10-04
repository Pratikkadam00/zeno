// The blog's posts, as data: the index and the post pages render these. Written
// by hand, in plain words, with nothing the app or the catalog can't back
// (the truthfulness rail in app/truthfulness.test.tsx and blog.test.tsx runs
// over every post). Two tokens are filled from the catalog at render time so a
// number here can never go stale: {SERVICE_COUNT} and {HARD_COUNT}.
import { serviceRecords } from "@zeno/service-catalog";

export type PostSection = {
  heading?: string;
  paragraphs: string[];
  list?: string[];
  ordered?: boolean;
};

export type Post = {
  slug: string;
  title: string;
  description: string;
  /** ISO date, the day it was published. */
  date: string;
  lead: string;
  sections: PostSection[];
  related: [label: string, href: string][];
};

export const POSTS: Post[] = [
  {
    slug: "how-to-find-all-your-subscriptions",
    title: "How to find every subscription you're paying for",
    description:
      "Forgotten subscriptions hide in three places: your inbox, your statements and the app stores. Here is how to search each one in about half an hour, without giving anyone your bank login.",
    date: "2026-10-04",
    lead:
      "Forgotten subscriptions hide in three places: your inbox, your statements, and the app stores. Here's how to search each one, in about half an hour, without handing anyone your bank login.",
    sections: [
      {
        paragraphs: [
          "The subscriptions you remember aren't the problem. The ones that cost you are the ones you signed up for on a phone two years ago, the trial that quietly converted, the plan a family member started on your card. They don't announce themselves. They just bill.",
          "The good news is that every one of them leaves a trace somewhere you already have access to. You don't need to connect your bank to anything to find them. You need three searches and a list."
        ]
      },
      {
        heading: "1. Your inbox, searched properly",
        paragraphs: [
          "Almost every paid service emails a receipt, and almost nobody reads them. In Gmail, paste this into the search box:",
          "subject:(receipt OR invoice OR renewal OR \"your subscription\") newer_than:1y",
          "Then try the same search with \"trial\", \"renews\" and \"payment\" in the subject. Outlook and Apple Mail have the same search operators under slightly different names; searching the subject line for \"receipt\" alone gets you most of the way.",
          "Go through the results once and write down four things for each service: the name, the amount, the date, and whether it bills monthly or yearly. Don't decide anything yet. You're building a list, not a verdict."
        ]
      },
      {
        heading: "2. The app stores",
        paragraphs: [
          "Anything you subscribed to inside an iPhone or Android app is billed by Apple or Google, not by the app, and the receipt comes from them. These are the ones people miss most often, because the email says \"Apple\" rather than the name of the thing you're paying for.",
          "On an iPhone: Settings, tap your name at the top, then Subscriptions. It lists active ones and, below them, expired ones. On Android: open the Play Store, tap your profile picture, then Payments & subscriptions, then Subscriptions.",
          "Add anything there to your list. Note that cancelling an app-store subscription happens on these screens, not inside the app itself; deleting the app does nothing to the billing."
        ]
      },
      {
        heading: "3. Your statements, as a spreadsheet",
        paragraphs: [
          "Your bank or card app can export the last few months as a CSV file. Three months is enough to catch monthly plans; a year catches the annual ones that bill once and vanish from memory.",
          "Open the file and sort it by description. Recurring charges land on roughly the same day each month with the same name. Look for the ones you don't recognise, and for the ones hiding behind a processor: a line that starts with PAYPAL or GOOGLE or APPLE.COM is a subscription paid through them, and you'll need to look inside that account to see which.",
          "For PayPal: Settings, then Payments, then Automatic payments. For Amazon: Your Account, then Memberships & Subscriptions. Both pages list everything set to renew."
        ]
      },
      {
        heading: "4. The ones you don't pay for yourself",
        paragraphs: [
          "If you share a card, a phone plan or a household, ask. A surprising number of \"mystery\" charges turn out to be a partner's streaming service or a child's game. They belong on the same list, with a name next to them."
        ]
      },
      {
        heading: "What to do with the list",
        paragraphs: [
          "Now you have the full picture, probably for the first time. Three things are worth doing while it's in front of you:"
        ],
        list: [
          "Write the next renewal date next to each one, and put the big ones in your calendar a week ahead.",
          "Mark anything you haven't opened in three months. That's your cancel list.",
          "For each cancel, use a guide rather than hunting through settings. Zeno's cancellation guides cover {SERVICE_COUNT} services, each with the direct link to that service's cancellation page."
        ],
        ordered: true
      },
      {
        heading: "A note on apps that ask for your bank login",
        paragraphs: [
          "Plenty of apps offer to do this search for you if you connect your bank account through a data aggregator. That works, and for some people it's the right trade. But it means giving a third party ongoing read access to your transactions, and it's worth knowing that the method above produces the same list from things you already hold.",
          "That's the way Zeno works: it reads the receipts in an inbox you connect and the statement files you import, on your phone, and only when you tap scan. No bank login required."
        ]
      }
    ],
    related: [
      ["All cancellation guides", "/cancel"],
      ["A subscription tracker without bank login", "/compare/no-bank-login"],
      ["A 20-minute subscription audit", "/blog/the-20-minute-subscription-audit"]
    ]
  },
  {
    slug: "free-trials-how-to-stop-paying-for-the-ones-you-forgot",
    title: "Free trials: how to stop paying for the ones you forgot",
    description:
      "A free trial converts by default, and the card is already on file. Four habits that keep a trial free: cancel on day one where you can, write the end date where you'll see it, know where it's billed, and watch for the annual plan.",
    date: "2026-10-04",
    lead:
      "A free trial is designed to become a paid plan while you're not looking. Four habits keep it free, and none of them take more than a minute.",
    sections: [
      {
        paragraphs: [
          "Nobody sets out to pay for a trial. The design does it for you: your card goes on file before the trial starts, the end date is mentioned once in small text, and converting is the default. Doing nothing is the expensive choice.",
          "The fix isn't willpower. It's a few habits that move the decision to the moment you sign up, when you're paying attention, instead of thirty days later, when you aren't."
        ]
      },
      {
        heading: "Cancel on day one, when the service lets you",
        paragraphs: [
          "Many services keep your access until the end of the period you've paid for or been given, even after you cancel. Netflix's own cancellation flow says the plan stays active until the billing date; Disney+'s says access continues until the end of the billing period. For services like these, the smartest moment to cancel a trial is right after you start it. You get the whole trial, and there's nothing to remember.",
          "Not every service works this way. Some end access the moment you cancel. The cancellation screen usually says which; if it doesn't, cancel a day or two before the end instead."
        ]
      },
      {
        heading: "Write the end date where you'll actually see it",
        paragraphs: [
          "If you can't cancel early, the end date has to live somewhere other than your memory. A calendar event two days before the trial ends, with the cancellation link pasted into it, is enough. The link matters: the point of the reminder is to make cancelling a ten-second job, not to send you searching through settings at eleven at night.",
          "Zeno does this part for you if you'd rather not: a trial on your ledger gets reminders seven days out, three days out, and the morning it ends, each with the amount it would charge."
        ]
      },
      {
        heading: "Know where it's billed",
        paragraphs: [
          "A trial started inside an iPhone or Android app is billed by Apple or Google. Cancelling your account on the service's website doesn't touch it, and neither does deleting the app. It has to be cancelled in the store: on an iPhone under Settings, your name, Subscriptions; on Android in the Play Store under Payments & subscriptions.",
          "This is the single most common way a \"cancelled\" trial keeps charging. When you sign up, notice whether you're paying the service or the store, and write that down with the end date."
        ]
      },
      {
        heading: "Watch for the annual plan",
        paragraphs: [
          "Some trials convert to a monthly plan. Others convert to a year, charged at once, and the signup screen said so in the line you didn't read. Before you tap start, find the price and the word after it: per month or per year. A trial that rolls into an annual charge deserves a reminder a week out, not two days."
        ]
      },
      {
        heading: "If you were charged anyway",
        paragraphs: [
          "Ask. Many services refund a first charge after a trial if you contact support promptly and haven't used the paid period. For app-store charges, Apple and Google both have refund request pages; a request made within a few days of the charge, explaining you meant to cancel the trial, is often granted. Cancel first, then ask, so the refund isn't followed by another charge."
        ]
      },
      {
        heading: "The habit that covers all of this",
        paragraphs: [
          "Keep one list of everything you're paying for, with its next renewal date. A trial goes on it the day it starts. That list is what Zeno is: a ledger of your subscriptions, built from receipts and statements you control, with a warning before every renewal. No bank login required."
        ]
      }
    ],
    related: [
      ["How to find every subscription you're paying for", "/blog/how-to-find-all-your-subscriptions"],
      ["How to cancel Netflix", "/cancel/netflix"],
      ["How to cancel Disney+", "/cancel/disney-plus"]
    ]
  },
  {
    slug: "why-cancelling-a-subscription-is-harder-than-starting-one",
    title: "Why cancelling a subscription is harder than starting one",
    description:
      "Starting a subscription takes one tap. Cancelling is designed to take more. The patterns to expect (the hidden link, the retention offer, the pause, the phone-only cancel) and how to get through each of them.",
    date: "2026-10-04",
    lead:
      "Starting a subscription takes one tap. Cancelling is designed to take more. Here are the patterns to expect, and the way through each one.",
    sections: [
      {
        paragraphs: [
          "Signing up is the easiest thing a company will ever let you do. Everything after that is built to keep you: the settings page where the cancel link isn't, the offer that appears the moment you try to leave, the chat window that has to \"process\" your request.",
          "None of this is an accident, and none of it is illegal in most places. It's product design with a goal, and the goal isn't yours. In Zeno's catalog of {SERVICE_COUNT} services, {HARD_COUNT} rate their cancellation hard or use documented dark patterns, and the rest are easier mostly because someone wrote down where the button is."
        ]
      },
      {
        heading: "The hidden link",
        paragraphs: [
          "The cancel option exists, but it's three menus deep under a heading that doesn't say cancel. Membership. Plan details. Manage. You'll find it eventually, which is the point: eventually is later than now, and later is when people give up.",
          "The way through: don't navigate, arrive. Every one of Zeno's guides carries the direct link to that service's cancellation page, so the hunt is skipped."
        ]
      },
      {
        heading: "The retention offer",
        paragraphs: [
          "You click cancel and a discount appears. Fifty percent off for three months. A free month. Sometimes two or three offers in a row, each on its own screen with a large button to accept and a small one to continue cancelling.",
          "The way through: decide before you start whether any price would keep you. If the answer is no, the offers are noise, and the small button is always there. If the answer is yes, take the offer and put the date it ends in your calendar, because the full price returns quietly."
        ]
      },
      {
        heading: "\"Pause instead\"",
        paragraphs: [
          "Pausing sounds like a gentle version of cancelling. It isn't. A paused plan is a plan that restarts on a date you'll have forgotten, with the card still on file. Some services, Hulu among them in its own cancellation flow, offer the pause right where you expected the cancel to be.",
          "The way through: unless you genuinely want the service back on a known date, choose cancel. If you do pause, treat the restart date like a trial end and write it down."
        ]
      },
      {
        heading: "Cancel by phone, chat or post",
        paragraphs: [
          "Some services won't let you cancel where you signed up. You have to call during business hours, or wait for a chat agent, or in a few cases send a letter. Each extra step loses a share of the people who meant to leave.",
          "The way through: do it anyway, and keep a record. Note the date, the time, the name of the person you spoke to, and ask for a confirmation number or email. If the charge appears again, that record is what gets it reversed."
        ]
      },
      {
        heading: "The confirmation that isn't",
        paragraphs: [
          "You clicked through everything and a screen said \"We're sorry to see you go.\" Was that the end? Sometimes the real confirmation needs one more click below the fold, or arrives by email, or never arrives, and the plan renews.",
          "The way through: a cancellation isn't done until the renewal date passes with no new charge. Screenshot the final screen, keep the email, and check the next statement. That rule is built into Zeno: a cancellation on your ledger is marked verified only once its renewal date passes with no new charge in the receipts or statements you scan or import, and a charge that shows up anyway gets flagged."
        ]
      },
      {
        heading: "Why this is worth knowing",
        paragraphs: [
          "Once you can name the pattern, it loses most of its power. The offer is just an offer. The pause is just a delay. The hidden link is a link, and someone has already found it for you. Go in with the direct link, decline what you don't want, and keep the proof."
        ]
      }
    ],
    related: [
      ["All cancellation guides", "/cancel"],
      ["How to cancel Netflix", "/cancel/netflix"],
      ["How to cancel Hulu", "/cancel/hulu"],
      ["Free trials: how to stop paying for the ones you forgot", "/blog/free-trials-how-to-stop-paying-for-the-ones-you-forgot"]
    ]
  },
  {
    slug: "the-20-minute-subscription-audit",
    title: "A 20-minute subscription audit",
    description:
      "A checklist for going through everything you pay for: list it, price it per year, mark what you haven't used in three months, cancel with a guide, set reminders for the rest, and repeat each quarter.",
    date: "2026-10-04",
    lead:
      "You don't need software to audit your subscriptions. You need a list, twenty minutes, and one honest question per line. Here's the whole routine.",
    sections: [
      {
        paragraphs: [
          "Most people have never seen all of their subscriptions in one place. Each one was a small, reasonable decision at the time, and the total was never shown to anyone. An audit is just putting them on one page and looking.",
          "This takes about twenty minutes the first time and five minutes a quarter after that. A spreadsheet is fine. A notes app is fine. What matters is that the list exists and has a date on it."
        ]
      },
      {
        heading: "Minute 0 to 10: build the list",
        paragraphs: [
          "Search your inbox for receipts, check the app-store subscription screens on your phone, and export three months of statements. The full method is in our guide to finding every subscription; the short version is that those three places hold all of them.",
          "For each one, write the name, the price, and whether it's monthly or yearly. Don't skip the small ones. The small ones are the whole problem."
        ]
      },
      {
        heading: "Minute 10 to 14: price everything per year",
        paragraphs: [
          "Monthly prices are designed to feel small. Multiply each by twelve and write that number next to it. Then add the column. The total is usually the moment the audit starts to feel worth doing.",
          "Zeno's ledger shows this as committed per month and the yearly figure beside it, so the total is always in view rather than something you work out once and forget."
        ]
      },
      {
        heading: "Minute 14 to 17: one question per line",
        paragraphs: [
          "For each subscription, ask when you last used it. Not whether you like it, or whether you might use it. When. If the honest answer is more than three months ago, mark it. That's the cancel list, and it's usually shorter than you fear and more expensive than you'd guess.",
          "Two more marks are worth making:"
        ],
        list: [
          "Duplicates: two services doing the same job (two cloud storage plans, two music apps). Keep one.",
          "Wrong tier: a plan with features you don't use. Downgrading is a cancellation you don't have to feel bad about."
        ]
      },
      {
        heading: "Minute 17 to 20: cancel, and set the reminders",
        paragraphs: [
          "Cancel the marked ones now, while the list is open, using a guide rather than hunting through settings. Zeno's guides cover {SERVICE_COUNT} services with the direct link to each cancellation page. For anything that fights you with offers or a pause button, decline and keep the confirmation.",
          "For everything you're keeping, write the next renewal date and put the yearly ones in your calendar a week ahead. A renewal you saw coming is a decision. One you didn't is a charge."
        ]
      },
      {
        heading: "Three mistakes that undo an audit",
        paragraphs: ["Most audits fail afterwards, not during. The same three things catch almost everyone:"],
        list: [
          "Cancelling on the website when the plan is billed by Apple or Google. Store subscriptions are cancelled on the store's own subscription screen; the service's account page can't touch them, and neither can deleting the app.",
          "Trusting the \"sorry to see you go\" screen. Keep the confirmation email, and check that the next renewal date passes with no new charge. Until then it isn't cancelled, it's pending.",
          "Doing it once. Prices rise, trials get started, a family member adds something. A list that isn't revisited is a list from last year."
        ]
      },
      {
        heading: "Every quarter: five minutes",
        paragraphs: [
          "Put a recurring reminder three months out. Next time, you're only checking what changed: new signups, trials, price rises. Most price rises arrive by email with a sentence you'll skim; the audit is where you notice that the number went up.",
          "This is what Zeno keeps for you between audits: the list, the renewal dates, the reminders, and a flag when a price rises or a cancelled service charges again. It's built from receipts and statements you control, and it never asks for your bank login."
        ]
      }
    ],
    related: [
      ["How to find every subscription you're paying for", "/blog/how-to-find-all-your-subscriptions"],
      ["Why cancelling a subscription is harder than starting one", "/blog/why-cancelling-a-subscription-is-harder-than-starting-one"],
      ["All cancellation guides", "/cancel"]
    ]
  }
];

export function findPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

/** Every word a post renders (lead and sections), for reading time and tests. */
export function postText(post: Post): string {
  return [post.lead, ...post.sections.flatMap((s) => [s.heading ?? "", ...s.paragraphs, ...(s.list ?? [])])].join(" ");
}

// The two figures a post may quote, from the catalog, never typed in.
const SERVICE_COUNT = serviceRecords.length;
const HARD_COUNT = serviceRecords.filter((s) => s.cancellationDifficulty === "hard" || s.cancellationDifficulty === "dark_pattern").length;

export function fillFigures(text: string): string {
  return text.replaceAll("{SERVICE_COUNT}", String(SERVICE_COUNT)).replaceAll("{HARD_COUNT}", String(HARD_COUNT));
}

/** Words as rendered (figures filled in). */
export function postWords(post: Post): number {
  return fillFigures(postText(post)).split(/\s+/).filter(Boolean).length;
}

/** At about 220 words a minute, never less than one. */
export function readingMinutes(post: Post): number {
  return Math.max(1, Math.round(postWords(post) / 220));
}

export const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
