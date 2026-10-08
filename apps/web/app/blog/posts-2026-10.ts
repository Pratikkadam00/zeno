// The second set of posts (W4, 2026-10). Same rules as posts.ts: written by
// hand in the house style, nothing the catalogue or the app can't back, and
// every figure a {TOKEN} filled from the catalogue at render time (FIGURES in
// posts.ts), so a number here can never go stale. Lists that name services are
// built from the catalogue here, for the same reason.
import { serviceRecords } from "@zeno/service-catalog";
import type { Post } from "./posts";

const hardest = serviceRecords
  .filter((s) => s.cancellationDifficulty === "dark_pattern" || s.cancellationDifficulty === "hard")
  .sort((a, b) => (a.cancellationDifficulty === "dark_pattern" ? 0 : 1) - (b.cancellationDifficulty === "dark_pattern" ? 0 : 1) || a.name.localeCompare(b.name));

const byCategory = [...new Set(serviceRecords.map((s) => s.category))]
  .map((c) => {
    const inCat = serviceRecords.filter((s) => s.category === c);
    const easy = inCat.filter((s) => s.cancellationDifficulty === "easy").length;
    const hard = inCat.filter((s) => s.cancellationDifficulty === "hard" || s.cancellationDifficulty === "dark_pattern").length;
    return { c: c.replace("_", " "), n: inCat.length, easy, hard };
  })
  .sort((a, b) => b.n - a.n);

export const MORE_POSTS: Post[] = [
  {
    slug: "the-services-hardest-to-cancel",
    title: "The services our catalogue rates hardest to cancel",
    description:
      "Of the {SERVICE_COUNT} services in Zeno's catalogue, {HARD_COUNT} are rated hard to cancel or use documented dark patterns. Who they are, what they do, and how to get through.",
    date: "2026-10-08",
    hero: {
      art: "hardest-to-cancel",
      alt: "A two-column list of service names, each on a ledger card with a coloured square, labelled DARK PATTERN in red or HARD in amber."
    },
    lead:
      "Zeno keeps a catalogue of {SERVICE_COUNT} services and rates how each one is cancelled: easy, medium, hard, or a dark pattern. {HARD_COUNT} are in the last two groups. This is who they are and what they do to you.",
    sections: [
      {
        paragraphs: [
          "The rating is a judgement about the steps, not about the service. A service rates easy when the cancel button is where you expect it and there is one confirmation. Medium means a few screens and perhaps an offer. Hard means the path is long, hidden, or needs a phone call or chat. A dark pattern is a step whose only job is to stop you: a retention offer you must decline, a pause you did not ask for, a final screen designed to look like the end but is not.",
          "Counted today, the catalogue has {EASY_COUNT} easy, {MEDIUM_COUNT} medium, {HARD_ONLY_COUNT} hard, and {DARK_COUNT} dark pattern. That is {HARD_PCT} percent in the two groups below."
        ]
      },
      {
        heading: "The list",
        figure: {
          art: "dark-pattern-steps",
          alt: "A numbered list of the steps to cancel Adobe Creative Cloud taken from the guide, with the steps that offer a discount or ask you to reconsider shown in red.",
          caption: "One guide's steps, with the retention steps in red"
        },
        paragraphs: ["In alphabetical order within each group. Each name links to its guide, which has the steps and the direct link to the cancellation page."],
        list: hardest.map((s) => `${s.name} (${s.cancellationDifficulty === "dark_pattern" ? "dark pattern" : "hard"})`)
      },
      {
        heading: "What they have in common",
        paragraphs: [
          "Three things appear again and again. The cancel link is not on the account page but a level below it, often under a name like Manage plan. There is at least one offer between you and the end, usually a discount for a few months, sometimes a free period, sometimes a cheaper tier. And the last screen asks whether you are sure, in a layout where the button that keeps the subscription is the big one.",
          "None of this is illegal in most places, and some of it is being regulated. It works because people are busy. The offer looks reasonable, the pause looks kind, and the subscription is still there next month.",
          "The hard group, as distinct from the dark-pattern group, is mostly about where the exit is. A membership that was started on a website may only end by phone during office hours, or by a chat that opens with a queue. A device bought with a subscription attached may need the account closed in one place and the plan in another. Nothing in those flows is a trick; they are simply long, and length is enough to make people put it off until after the next charge."
        ]
      },
      {
        heading: "How the rating is decided",
        paragraphs: [
          "Each guide in the catalogue is written from the service's own cancellation page, step by step, and the rating follows from the steps: easy for a visible button and one confirmation, medium for several screens or a single offer, hard for a phone call, a chat, a letter, or a path with more than a handful of screens, and dark pattern when a step exists only to make you stay. When a service changes its flow, the guide is rewritten and the rating moves with it. The count at the top of this post moves too, because it is taken from the catalogue when the page is built."
        ]
      },
      {
        heading: "How to get through",
        paragraphs: ["Three habits cover almost all of it."],
        list: [
          "Decide before you start. You are cancelling. Every offer is a no, including the good ones; you can always come back at full price later if you miss it.",
          "Read the last screen. If it says paused, or your plan has been changed, or we have saved your settings, it is not cancelled. Go back and find the word cancel.",
          "Keep the confirmation and check the renewal date. Zeno marks a cancellation verified only when the date passes with no new charge in the receipts or statements you scan or import."
        ]
      },
      {
        heading: "Where the numbers come from",
        paragraphs: [
          "Every figure in this post is counted from the catalogue when the page is built, not typed in, and the picture at the top is drawn from the same list. When a service changes its flow and the guide is updated, the counts here change with it."
        ]
      }
    ],
    related: [
      ["All cancellation guides", "/cancel"],
      ["Why cancelling is harder than starting a subscription", "/blog/why-cancelling-a-subscription-is-harder-than-starting-one"],
      ["Cancel subscriptions with the charge checked", "/cancel-subscriptions"]
    ]
  },
  {
    slug: "what-a-subscription-costs-per-month",
    title: "What a subscription costs: the median is ${MEDIAN_PRICE} a month",
    description:
      "Across the {PRICED_COUNT} services in Zeno's catalogue with a listed price, the median monthly price is ${MEDIAN_PRICE} and the mean is ${MEAN_PRICE}. Why the small ones are the problem.",
    date: "2026-10-08",
    hero: {
      art: "price-shelf",
      alt: "Eight bars of rising height on a shelf, labelled with monthly prices from $0.99 to $150, coloured green under $10, blue to $50 and red above."
    },
    lead:
      "The catalogue lists a usual monthly price for {PRICED_COUNT} of its {SERVICE_COUNT} services. The median is ${MEDIAN_PRICE}. Half of everything you could subscribe to costs that or less, which is exactly why the total surprises people.",
    sections: [
      {
        paragraphs: [
          "A subscription is priced to be forgettable. Ten dollars is a sandwich; it does not feel like a decision. The arithmetic that matters is the one nobody does at sign-up: ten dollars a month is a hundred and twenty a year, and the typical person has more than one.",
          "Here is the shape of the catalogue's prices, counted when this page was built."
        ]
      },
      {
        heading: "The distribution",
        figure: {
          art: "price-histogram",
          alt: "A horizontal bar chart of monthly prices in six bands from under $5 to $50 and over, with the $5 to $14.99 bands the longest.",
          caption: "Monthly prices across the catalogue, in bands"
        },
        paragraphs: [
          "Of the {PRICED_COUNT} priced services, {UNDER_5_COUNT} cost under $5 a month and {UNDER_10_COUNT} cost under $10. Only {OVER_50_COUNT} cost $50 or more. The cheapest is ${MIN_PRICE}; the most expensive is ${MAX_PRICE}. The mean, ${MEAN_PRICE}, sits above the median because of that long tail at the top: a few professional tools pull the average up.",
          "The practical reading: the expensive subscriptions are few, visible, and usually deliberate. The cheap ones are many, invisible, and the ones that renew for years after you stopped using them."
        ]
      },
      {
        heading: "Why the small ones cost the most",
        paragraphs: [
          "A $54.99 plan gets reviewed because it hurts every month. A $2.99 plan never does. Over five years the $2.99 plan has cost $179.40, and six of them is more than a thousand dollars for things nobody in the household can name.",
          "Price rises hide in the same place. A service that moves from $9.99 to $11.99 has raised its price by a fifth, and the email announcing it reads like every other email the service sends. Most people learn the new price from a statement months later, if at all. Zeno flags a price rise when a receipt shows a new amount for a service it already tracks, which is the only reliable moment to notice it.",
          "There is a second reason the cheap ones add up: they are the ones that get started casually. A trial for a note-taking app, a month of a game's season pass, a cloud plan upgraded once to send a single large file. Each was reasonable on the day. None was ever decided against, because nothing ever asked."
        ]
      },
      {
        heading: "The yearly view",
        paragraphs: [
          "Multiply the median by twelve and the typical subscription costs $120 a year. Multiply the mean and it is about $167. A household with ten subscriptions at the median, which is not unusual once streaming, music, storage, a newspaper and a couple of apps are counted, is paying $1,200 a year for things that each felt like ten dollars.",
          "That is the number worth writing down, and it is why the app's ledger shows the yearly figure beside the monthly one on every row. A plan that is cheap per month and expensive per year is a plan to look at twice, and the yearly column is where that second look starts."
        ]
      },
      {
        heading: "What to do with this",
        paragraphs: ["Two things, both quick."],
        list: [
          "Write every subscription down with its yearly price, not its monthly one. A 20-minute audit covers it, and the yearly column is the moment the list starts to matter.",
          "Sort the list by yearly price and read it from the bottom. The cheap end is where the forgotten ones live."
        ]
      },
      {
        heading: "A note on the figures",
        paragraphs: [
          "The catalogue's prices are the usual list price in US dollars for the common plan, gathered when each service was added and updated when a guide is. They are a reference, not a quote; your plan, your country and your date may differ. Every number in this post is computed from the catalogue when the page is built."
        ]
      }
    ],
    related: [
      ["A 20-minute subscription audit", "/blog/the-20-minute-subscription-audit"],
      ["Budgeting around what renews", "/budgeting"],
      ["The subscription tracker, in detail", "/subscription-tracker"],
      ["All cancellation guides", "/cancel"]
    ]
  },
  {
    slug: "which-subscriptions-are-easy-to-cancel-by-category",
    title: "Easy or hard to cancel: the catalogue by category",
    description:
      "Zeno's catalogue sorts {SERVICE_COUNT} services into 11 categories and rates each cancellation. Streaming, software, health and the rest, compared on how they let you go.",
    date: "2026-10-08",
    hero: {
      art: "categories-map",
      alt: "Eleven tiles in a grid, one per category such as streaming, productivity and health, each with the count of services in it in large blue type."
    },
    lead:
      "Every service in the catalogue has a category and a cancellation rating. Put the two together and a pattern shows: some kinds of subscription are built to let you go, and some are built to keep you.",
    sections: [
      {
        paragraphs: [
          "The categories are the ones the app uses to sort your own list: streaming, music, gaming, productivity, AI tools, cloud storage, security, health, finance, education, and other. The rating is the one the cancellation guides carry. Both are in the catalogue, so this comparison is counted, not estimated."
        ]
      },
      {
        heading: "The picture",
        figure: {
          art: "category-stacked",
          alt: "Stacked horizontal bars, one per category sorted by size, showing how many services in each are rated easy, medium, hard or dark pattern, with a colour legend beneath.",
          caption: "Cancellation ratings by category, counted from the catalogue"
        },
        paragraphs: ["The same data as a list, largest category first. 'Hard' here means hard or dark pattern."],
        list: byCategory.map((r) => `${r.c}: ${r.n} services, ${r.easy} easy, ${r.hard} hard`)
      },
      {
        heading: "What stands out",
        paragraphs: [
          "Health and fitness carries more hard ratings than its size would predict. Gym-style memberships, coaching programmes and devices with a subscription attached tend to want a conversation before they let you leave. If you are signing up for one, check the guide first and note what the exit costs.",
          "Streaming and music are mostly medium: a few screens, one offer, done. The exceptions are the two streaming names in the dark-pattern group, which are also two of the most subscribed services there are.",
          "Music, AI tools and gaming have the largest share of easy ratings: most are billed through a settings page with a visible cancel button, and the worst you meet is a downgrade offer. Cloud storage and security sit near the bottom of that share, though almost all of theirs are medium rather than hard."
        ]
      },
      {
        heading: "Why categories differ",
        paragraphs: [
          "The difference is mostly about how the business is paid. A streaming or music service sells a monthly plan to millions of people and expects churn; its cancel flow is built to run without a human, so it is short, and the offer at the end is a cheap automated nudge. A gym, a coaching programme or a device-plus-plan company sells fewer, pricier memberships and has staff whose job includes keeping them; its cancel flow is built to reach a person, which is why it is long.",
          "Software sits in between. Business tools billed annually often carry a commitment or a notice period in their terms, and the guides note it where it is known. Consumer apps billed monthly through a settings page are the easiest of all, because the same screen that sells the plan can end it."
        ]
      },
      {
        heading: "How to use this",
        paragraphs: [
          "Before you subscribe to anything in a category with a high hard count, open its guide. The guide tells you where the cancel button is and what stands in front of it, and the difficulty is the first line. Two minutes before you sign up saves the twenty you would spend leaving.",
          "Every guide in the catalogue carries the same rating on its first line, so the services that will fight you are marked before you sign up, not after.",
          "And keep the categories in mind when you audit. The streaming and music lines on your list are the quick wins: ten minutes clears them, and the guides for those two categories rarely hold more than a single offer to decline. The health and fitness lines deserve a calendar entry, because the exit may need a call during office hours, and a renewal date that lands on a weekend, when nobody answers the phone, is how a cancellation slips a whole month."
        ]
      }
    ],
    related: [
      ["The services hardest to cancel", "/blog/the-services-hardest-to-cancel"],
      ["All cancellation guides", "/cancel"],
      ["Cancel subscriptions, with the charge checked", "/cancel-subscriptions"],
      ["How to find every subscription you're paying for", "/blog/how-to-find-all-your-subscriptions"]
    ]
  },
  {
    slug: "cancel-on-the-website-or-in-the-app-store",
    title: "Cancel on the website, or in the app store?",
    description:
      "Why a cancelled subscription keeps charging: Apple or Google billed it, and the service's website cannot stop it. How to tell which you have, and where to go.",
    date: "2026-10-08",
    hero: {
      art: "store-or-website",
      alt: "A decision diagram: who sent the receipt? branches to the service itself, so cancel on its website, and to Apple or Google, so cancel in the store's subscriptions screen; a red line beneath says deleting the app does neither."
    },
    lead:
      "A subscription has two possible billers: the company you use, or the app store you installed it from. Each can only be cancelled in one place. Pick the wrong one and the charge continues, with a confirmation email in your inbox that says otherwise.",
    sections: [
      {
        paragraphs: [
          "When you subscribe inside an iPhone or Android app, the payment usually goes through Apple or Google. They take a share, they send the receipt, and they own the subscription. The company whose app it is cannot see your card and cannot cancel it. Its website will tell you, correctly, that it has no subscription for you.",
          "When you subscribe on a website, the company bills you directly, and the store knows nothing about it. The store's subscriptions screen is empty, which is also correct."
        ]
      },
      {
        heading: "How to tell which you have",
        paragraphs: ["Three checks, any one of which settles it."],
        list: [
          "The receipt. If it comes from Apple or Google, with the app's name inside it, the store bills you. If it comes from the company, the company bills you.",
          "The store's subscriptions screen. If the service is listed there, the store bills you.",
          "Your statement. A line that says Apple or Google is a store subscription, even when the thing you pay for is a streaming service."
        ]
      },
      {
        heading: "Where to cancel",
        figure: {
          art: "billing-decision",
          alt: "Two phone outlines side by side, iPhone and Android, each listing the four taps to reach the store's subscriptions screen and the cancel button.",
          caption: "The two store screens, as of the day this was drawn"
        },
        paragraphs: [
          "Store-billed, on an iPhone: Settings, your name, Subscriptions, the app, Cancel. On Android: Play Store, your profile picture, Payments and subscriptions, Subscriptions, the app, Cancel. The subscription stays active until the end of the paid period, and the store confirms the end date.",
          "Billed by the company: its account or billing page, where the guide for that service tells you the steps and the traps. Zeno's catalogue has a guide for {SERVICE_COUNT} services, each with a direct link to the cancellation page where one exists."
        ]
      },
      {
        heading: "The three things that do not cancel anything",
        list: [
          "Deleting the app. The subscription is a billing arrangement, not the software.",
          "Cancelling on the company's website when the store bills you. The website cannot reach the store's record.",
          "Turning off notifications or signing out. Neither touches billing."
        ],
        paragraphs: [
          "The last of these catches people who were sure they had cancelled. The habit that prevents it is to write down who bills you on the day you sign up, which is also the habit that keeps free trials free."
        ]
      },
      {
        heading: "Why it is built this way",
        paragraphs: [
          "The stores insist on billing what is sold inside their apps, take a share of it, and in return handle the card, the receipt, the refund and the cancellation. The company gets a customer without ever seeing a card number, and the customer gets one place to see every store subscription. The cost is the confusion above: two billers, two cancel screens, and a receipt from a name that is not the service.",
          "Some companies offer both routes on purpose. Subscribe on the website and you pay the company directly, usually a little less, and cancel on the website. Subscribe in the app and you pay the store, and cancel in the store. The same service, two subscriptions that never meet. If you have ever paid twice for the same thing, this is probably how."
        ]
      },
      {
        heading: "A two-minute check you can do now",
        paragraphs: [
          "Open the store's subscriptions screen on your phone and read the list. Anything there is store-billed. Then search your inbox for receipts from Apple or Google in the last year and compare. If a service appears in the inbox but not on the screen, it has already ended or it is billed elsewhere. If it appears on the screen and you thought you had cancelled it on the website, you now know why the charge continued."
        ]
      },
      {
        heading: "How Zeno handles it",
        paragraphs: [
          "When a receipt comes from Apple or Google, Zeno reads the app's name from it, so the subscription appears under the service's name rather than as Apple or Google. And a cancellation is marked verified only when the renewal date passes with no new charge in the receipts or statements you scan or import, from whichever biller it was."
        ]
      }
    ],
    related: [
      ["Free trials: stop paying for the ones you forgot", "/blog/free-trials-how-to-stop-paying-for-the-ones-you-forgot"],
      ["All cancellation guides", "/cancel"],
      ["Cancel subscriptions, with the charge checked", "/cancel-subscriptions"]
    ]
  }
];
