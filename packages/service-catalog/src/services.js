const now = "2026-05-24T00:00:00.000Z";
const logoColors = ["#2563EB", "#7C3AED", "#0D9488", "#F59E0B", "#EF4444", "#15803D", "#F43F5E", "#64748B"];
const guideOverrides = {
    netflix: [
        "Go to netflix.com and sign in",
        "Click your profile icon top right",
        "Select Account",
        "Under Membership, click Cancel Membership",
        "Confirm cancellation - stays active until billing date"
    ],
    spotify: [
        "Go to spotify.com/account",
        "Click Subscription in left menu",
        "Click Change or Cancel Plan",
        "Select Cancel Premium",
        "Follow prompts to confirm"
    ],
    "amazon-prime": [
        "Go to amazon.com/mc/pipelines/cancellation",
        "Click End Trial or Cancel Membership",
        "Amazon will show retention offers - click Continue to Cancel each time",
        "Select a cancellation reason",
        "Click Cancel Prime - ignore any final offers",
        "You will receive a confirmation email"
    ],
    "chatgpt-plus": [
        "Go to chat.openai.com",
        "Click your profile icon bottom left",
        "Select My Plan",
        "Click Manage my subscription",
        "Click Cancel Plan and confirm"
    ],
    "claude-pro": [
        "Go to claude.ai/settings/billing",
        "Click Cancel subscription",
        "Confirm cancellation"
    ],
    midjourney: [
        "Go to midjourney.com/account",
        "Click Manage Subscription",
        "Select Cancel Plan",
        "Choose end of billing period or immediately",
        "Confirm"
    ],
    "adobe-creative-cloud": [
        "Go to account.adobe.com/plans",
        "Click Manage Plan next to Creative Cloud",
        "Click Cancel Plan - Adobe will offer discounts, decline them all",
        "Select a cancellation reason from dropdown",
        "WARNING: If in first year, Adobe charges an early termination fee of 50% of remaining contract",
        "Click Continue to confirm - check your email for confirmation"
    ],
    "xbox-game-pass-ultimate": [
        "Go to account.microsoft.com/services",
        "Find Xbox Game Pass Ultimate",
        "Click Manage",
        "Select Cancel subscription",
        "Choose to cancel at end of period"
    ],
    "disney-plus": [
        "Go to disneyplus.com and log in",
        "Click your profile icon, then Account",
        "Under Subscription, select your Disney+ plan",
        "Click Cancel Subscription and complete the short survey",
        "Confirm - access continues until the end of the billing period"
    ],
    hulu: [
        "Go to secure.hulu.com/account",
        "Scroll to Your Subscription and click Cancel",
        "Hulu offers to pause instead - choose Continue to Cancel",
        "Pick a reason and click Cancel",
        "You keep access until the current period ends"
    ],
    max: [
        "Go to max.com and sign in",
        "Click your profile, then Settings then Subscription",
        "If you subscribed via Apple/Amazon/Roku, cancel there instead",
        "Click Manage Subscription then Cancel Subscription",
        "Confirm cancellation"
    ],
    "youtube-premium": [
        "Go to youtube.com/paid_memberships (or myaccount.google.com)",
        "Click Manage membership",
        "Click Deactivate / Cancel",
        "Click Continue to cancel through any retention offers",
        "Premium runs until the end of the billing cycle"
    ],
    "apple-tv-plus": [
        "On iPhone/iPad open Settings and tap your name",
        "Tap Subscriptions, then Apple TV+",
        "Tap Cancel Subscription and confirm",
        "On the web: tv.apple.com, account icon, Manage Subscriptions"
    ],
    peacock: [
        "Go to peacocktv.com and sign in",
        "Click your account, then Plans & Payment",
        "Click Change or Cancel Plan, then Cancel Plan",
        "Confirm - access continues until the renewal date"
    ],
    "paramount-plus": [
        "Go to paramountplus.com and sign in",
        "Click your account icon, then Account",
        "Under Subscription & Billing, click Cancel Subscription",
        "Decline the retention offer and confirm",
        "If billed via Apple/Amazon/Roku, cancel through that provider"
    ],
    crunchyroll: [
        "Go to crunchyroll.com and sign in",
        "Open your profile menu, then Settings, then Membership",
        "Click Cancel Membership and confirm",
        "Premium continues until the period ends",
        "If you subscribed in the app store, cancel there instead"
    ],
    "perplexity-pro": [
        "Go to perplexity.ai and sign in",
        "Open Settings (gear icon), then the Account section",
        "Click Manage Subscription, then Cancel",
        "Confirm cancellation"
    ],
    "github-copilot": [
        "Go to github.com/settings/copilot",
        "Under your Copilot plan, click Cancel Copilot",
        "Confirm - access continues until the end of the billing cycle"
    ],
    "cursor-pro": [
        "Go to cursor.com and sign in",
        "Open Settings, then Billing / Manage Subscription",
        "Click Cancel Subscription in the Stripe billing portal",
        "Confirm"
    ],
    "grammarly-premium": [
        "Go to account.grammarly.com and sign in",
        "Open the Subscription tab",
        "Click Cancel Subscription and decline the offers",
        "Select a reason and confirm - Premium stays active until the period ends"
    ],
    notion: [
        "Go to notion.so and open Settings",
        "Click Plans (or Billing) in the sidebar",
        "Click Change Plan, then Downgrade to Free / Cancel",
        "Confirm - paid features remain until the cycle ends"
    ],
    figma: [
        "Open figma.com, click your account, then Settings",
        "Go to the Billing tab for your team",
        "Lower the seats to zero or click Cancel Plan",
        "Confirm - note Figma bills annually by default"
    ],
    "canva-pro": [
        "Go to canva.com, click your account, then Settings",
        "Open Billing & plans",
        "Click your plan, then Cancel subscription",
        "Decline the discount offer and confirm - Pro continues until renewal"
    ],
    "dropbox-plus": [
        "Go to dropbox.com/account/billing",
        "Click Cancel plan under your plan",
        "Dropbox offers a discount - choose Continue to cancel",
        "Pick a reason and confirm - access continues until the period ends"
    ],
    "microsoft-365": [
        "Go to account.microsoft.com/services",
        "Find Microsoft 365 and click Manage",
        "Turn off Recurring billing, or click Cancel subscription",
        "Turning off recurring billing keeps access until the period ends"
    ],
    "google-workspace": [
        "Go to admin.google.com, then Billing, then Subscriptions",
        "Select your Workspace subscription",
        "Click Cancel Subscription",
        "Confirm - note any commitment terms on annual plans"
    ],
    "1password": [
        "Go to your account at start.1password.com",
        "Open the Billing section",
        "Click Cancel / change plan",
        "Confirm"
    ],
    nordvpn: [
        "Go to my.nordaccount.com and sign in",
        "Open Billing, then Subscriptions",
        "Turn off Auto-renewal (there is no instant cancel - disabling auto-renew stops future charges)",
        "If within 30 days, request a refund via live chat",
        "Confirm"
    ],
    expressvpn: [
        "Go to expressvpn.com and sign in to your account",
        "Open Subscription, then Manage Settings",
        "Turn off automatic renewal",
        "For a refund within 30 days, contact 24/7 live chat",
        "Confirm"
    ],
    "slack-pro": [
        "Go to your workspace, then Settings & administration, then Billing",
        "Open the plan settings and choose to cancel / downgrade",
        "Switch the workspace to the Free plan",
        "Confirm - Slack credits unused time on annual plans"
    ],
    "zoom-pro": [
        "Go to zoom.us/billing and sign in",
        "Under Current Plans, click Cancel Subscription",
        "Choose to cancel at the end of the term",
        "Confirm"
    ],
    audible: [
        "Go to audible.com and hover your name, then Account Details",
        "Click Cancel membership (use desktop web - the app hides this)",
        "Audible offers to pause or take 3 free months - decline and Continue to cancel",
        "Select a reason and confirm - you keep books you already own"
    ],
    "apple-music": [
        "On iPhone open Settings and tap your name, then Subscriptions",
        "Tap Apple Music, then Cancel Subscription",
        "Confirm",
        "On Android: open the Apple Music app, account icon, Manage Subscription"
    ],
    "youtube-music": [
        "Go to music.youtube.com (or myaccount.google.com)",
        "Click your profile, then Paid memberships",
        "Click Manage membership, then Cancel",
        "Continue past any offers and confirm"
    ],
    peloton: [
        "Go to onepeloton.com and sign in (use the web, not the app)",
        "Open your account, then Subscriptions / Membership",
        "Click Manage, then Cancel Membership",
        "Confirm - separate App and All-Access memberships are cancelled separately"
    ],
    headspace: [
        "Go to headspace.com and log in (web, not the app store)",
        "Open your account / Subscription settings",
        "Click Turn off auto-renew / Cancel subscription",
        "Confirm - access continues until the period ends"
    ],
    calm: [
        "Cancel where you subscribed: iPhone Settings then Subscriptions, or Google Play",
        "If you signed up on calm.com, open Account then Manage Subscription",
        "Click Cancel / Turn off auto-renew",
        "Confirm"
    ],
    masterclass: [
        "Go to masterclass.com and sign in",
        "Open Settings, then the Account / Subscription tab",
        "Click Cancel Subscription (annual plans bill yearly)",
        "Confirm - access continues until the term ends"
    ],
    skillshare: [
        "Go to skillshare.com and sign in",
        "Open Account Settings, then the Membership / Payments tab",
        "Click Cancel Membership",
        "Confirm - Premium stays active until the period ends"
    ]
};
const requestedRows = `
Netflix|netflix|https://www.netflix.com|https://www.netflix.com/cancelplan|dark_pattern|streaming|15.49|
Spotify|spotify|https://www.spotify.com|https://www.spotify.com/account/subscription/cancel|medium|streaming|10|
Disney+|disney-plus|https://www.disneyplus.com|https://www.disneyplus.com/account|medium|streaming|9.99|
Hulu|hulu|https://www.hulu.com|https://secure.hulu.com/account/cancel|medium|streaming|9.99|
HBO Max / Max|max|https://www.max.com|https://www.max.com/account/subscription|medium|streaming|9.99|
Apple TV+|apple-tv-plus|https://tv.apple.com|https://support.apple.com/en-us/118428|easy|streaming|9.99|
Peacock|peacock|https://www.peacocktv.com|https://www.peacocktv.com/account/cancel-subscription|easy|streaming|7.99|
Paramount+|paramount-plus|https://www.paramountplus.com|https://www.paramountplus.com/account/cancel|easy|streaming|7.99|
YouTube Premium|youtube-premium|https://www.youtube.com/premium|https://myaccount.google.com/payments-and-subscriptions|easy|streaming|13.99|
Amazon Prime|amazon-prime|https://www.amazon.com/amazonprime|https://www.amazon.com/mc/pipelines/cancellation|dark_pattern|streaming|14.99|
Crunchyroll|crunchyroll|https://www.crunchyroll.com|https://www.crunchyroll.com/account/membership|easy|streaming|7.99|
Twitch|twitch|https://www.twitch.tv|https://www.twitch.tv/settings/subscriptions|easy|streaming|5.99|
Mubi|mubi|https://mubi.com|https://mubi.com/account|easy|streaming|14.99|
Discovery+|discovery-plus|https://www.discoveryplus.com|https://www.discoveryplus.com/account|easy|streaming|8.99|
Fubo TV|fubo-tv|https://www.fubo.tv|https://www.fubo.tv/account|medium|streaming|79.99|
Sling TV|sling-tv|https://watch.sling.com|https://watch.sling.com/account|medium|streaming|40|
Philo|philo|https://www.philo.com|https://www.philo.com/account|easy|streaming|25|
AMC+|amc-plus|https://www.amcplus.com|https://www.amcplus.com/account|easy|streaming|8.99|
BritBox|britbox|https://www.britbox.com|https://www.britbox.com/account|easy|streaming|8.99|
Criterion Channel|criterion-channel|https://www.criterionchannel.com|https://www.criterionchannel.com/account|easy|streaming|10.99|
ChatGPT Plus|chatgpt-plus|https://chat.openai.com|https://chat.openai.com/account/billing|medium|ai_tools|20|
Claude Pro|claude-pro|https://claude.ai|https://claude.ai/settings/billing|easy|ai_tools|20|
Midjourney|midjourney|https://www.midjourney.com|https://www.midjourney.com/account|medium|ai_tools|10|
Perplexity Pro|perplexity-pro|https://www.perplexity.ai|https://www.perplexity.ai/settings/account|easy|ai_tools|20|
Grok Premium|grok-premium|https://x.com|https://x.com/i/premium_sign_up|easy|ai_tools|16|
GitHub Copilot|github-copilot|https://github.com/features/copilot|https://github.com/settings/copilot|easy|ai_tools|10|
Cursor Pro|cursor-pro|https://cursor.com|https://cursor.com/settings|easy|ai_tools|20|
Runway Gen|runway-gen|https://app.runwayml.com|https://app.runwayml.com/settings/billing|medium|ai_tools|15|
ElevenLabs|elevenlabs|https://elevenlabs.io|https://elevenlabs.io/subscription|easy|ai_tools|5|
Suno AI|suno-ai|https://suno.com|https://suno.com/account|easy|ai_tools|10|
Udio|udio|https://www.udio.com|https://www.udio.com/account|easy|ai_tools|10|
HeyGen|heygen|https://app.heygen.com|https://app.heygen.com/settings/billing|medium|ai_tools|29|
Synthesia|synthesia|https://www.synthesia.io|https://www.synthesia.io/account/billing|medium|ai_tools|30|
Jasper AI|jasper-ai|https://app.jasper.ai|https://app.jasper.ai/settings/billing|medium|ai_tools|39|
Copy.ai|copy-ai|https://app.copy.ai|https://app.copy.ai/account/billing|easy|ai_tools|36|
Writesonic|writesonic|https://app.writesonic.com|https://app.writesonic.com/settings/billing|easy|ai_tools|16|
Bolt.new|bolt-new|https://bolt.new|https://bolt.new/settings|easy|ai_tools|20|
Lovable|lovable|https://lovable.dev|https://lovable.dev/settings|easy|ai_tools|20|
Replit|replit|https://replit.com|https://replit.com/account|easy|ai_tools|25|
V0 by Vercel|v0-by-vercel|https://v0.dev|https://v0.dev/settings|easy|ai_tools|20|
Pika Labs|pika-labs|https://pika.art|https://pika.art/account|easy|ai_tools|8|
Kling AI|kling-ai|https://klingai.com|https://klingai.com/account|easy|ai_tools|10|
Leonardo AI|leonardo-ai|https://app.leonardo.ai|https://app.leonardo.ai/settings|easy|ai_tools|12|
Adobe Firefly|adobe-firefly|https://firefly.adobe.com|https://account.adobe.com/plans|dark_pattern|ai_tools|10|
Descript|descript|https://www.descript.com|https://www.descript.com/account/billing|medium|ai_tools|24|
Otter.ai|otter-ai|https://otter.ai|https://otter.ai/settings/subscription|easy|ai_tools|17|
Notion AI|notion-ai|https://www.notion.so|https://www.notion.so/profile/billing|medium|ai_tools|10|
Grammarly Premium|grammarly-premium|https://www.grammarly.com|https://account.grammarly.com/subscription|medium|ai_tools|30|
Loom|loom|https://www.loom.com|https://www.loom.com/looms/settings/account|easy|ai_tools|15|
Superhuman|superhuman|https://mail.superhuman.com|https://mail.superhuman.com/settings|medium|ai_tools|30|
Mem.ai|mem-ai|https://get.mem.ai|https://get.mem.ai/settings|easy|ai_tools|14|
Readwise|readwise|https://readwise.io|https://readwise.io/accounts/settings|easy|ai_tools|8|
Speechify|speechify|https://speechify.com|https://speechify.com/account|medium|ai_tools||139
Beehiiv|beehiiv|https://app.beehiiv.com|https://app.beehiiv.com/settings/billing|easy|ai_tools|39|
Substack|substack|https://substack.com|https://substack.com/account/billing|easy|ai_tools||
Cal.com|cal-com|https://app.cal.com|https://app.cal.com/settings/billing|easy|ai_tools|15|
Zapier|zapier|https://zapier.com|https://zapier.com/app/settings/billing|medium|ai_tools|20|
Make.com|make-com|https://www.make.com|https://www.make.com/en/billing|easy|ai_tools|9|
n8n Cloud|n8n-cloud|https://app.n8n.cloud|https://app.n8n.cloud/settings/plan|easy|ai_tools|20|
Adobe Creative Cloud|adobe-creative-cloud|https://www.adobe.com/creativecloud.html|https://account.adobe.com/plans|dark_pattern|productivity|55|
Notion|notion|https://www.notion.so|https://www.notion.so/profile/billing|medium|productivity|10|
Linear|linear|https://linear.app|https://linear.app/settings/billing|easy|productivity|8|
Figma|figma|https://www.figma.com|https://www.figma.com/settings/billing|medium|productivity|15|
Asana|asana|https://app.asana.com|https://app.asana.com/admin/billing|medium|productivity|11|
Monday.com|monday-com|https://monday.com|https://auth.monday.com/users/sign_in|hard|productivity|9|
Jira|jira|https://www.atlassian.com/software/jira|https://admin.atlassian.com/billing|medium|productivity|8|
Confluence|confluence|https://www.atlassian.com/software/confluence|https://admin.atlassian.com/billing|medium|productivity|6|
Trello Premium|trello-premium|https://trello.com|https://trello.com/billing|easy|productivity|5|
ClickUp|clickup|https://app.clickup.com|https://app.clickup.com/settings/billing|medium|productivity|7|
Airtable|airtable|https://airtable.com|https://airtable.com/account|medium|productivity|20|
Coda|coda|https://coda.io|https://coda.io/account|easy|productivity|10|
Miro|miro|https://miro.com|https://miro.com/app/settings/billing|medium|productivity|10|
Slack Pro|slack-pro|https://slack.com|https://slack.com/intl/en-us/help/articles/billing-cancel|medium|productivity|8|
Zoom Pro|zoom-pro|https://zoom.us|https://zoom.us/billing|medium|productivity|15|
Microsoft 365|microsoft-365|https://www.microsoft.com/microsoft-365|https://account.microsoft.com/services|medium|productivity|10|
Google Workspace|google-workspace|https://workspace.google.com|https://admin.google.com/ac/billing|medium|productivity|6|
Dropbox Plus|dropbox-plus|https://www.dropbox.com|https://www.dropbox.com/account/billing|medium|productivity|10|
Box|box|https://account.box.com|https://account.box.com/settings/billing|medium|productivity|15|
1Password|1password|https://my.1password.com|https://my.1password.com/profile/billing|easy|productivity|3|
LastPass|lastpass|https://lastpass.com|https://lastpass.com/my.php|medium|productivity|3|
Bitwarden|bitwarden|https://vault.bitwarden.com|https://vault.bitwarden.com/#/settings/subscription|easy|productivity|1|
NordVPN|nordvpn|https://my.nordaccount.com|https://my.nordaccount.com/dashboard/nordvpn/subscription|medium|productivity|13|
ExpressVPN|expressvpn|https://www.expressvpn.com|https://www.expressvpn.com/subscriptions|medium|productivity|13|
Surfshark|surfshark|https://my.surfshark.com|https://my.surfshark.com/account/subscription|easy|productivity|13|
Canva Pro|canva-pro|https://www.canva.com|https://www.canva.com/settings/purchase-history|medium|productivity|15|
Sketch|sketch|https://www.sketch.com|https://www.sketch.com/profile/billing|easy|productivity|9|
Framer|framer|https://framer.com|https://framer.com/account/billing|easy|productivity|15|
Webflow|webflow|https://webflow.com|https://webflow.com/dashboard/account/billing|medium|productivity|16|
GitHub Pro|github-pro|https://github.com|https://github.com/settings/billing|easy|productivity|4|
GitLab Premium|gitlab-premium|https://gitlab.com|https://gitlab.com/profile/billings|easy|productivity|29|
Vercel Pro|vercel-pro|https://vercel.com|https://vercel.com/account/billing|easy|productivity|20|
Railway|railway|https://railway.app|https://railway.app/account/billing|easy|productivity|5|
Render|render|https://dashboard.render.com|https://dashboard.render.com/billing|easy|productivity|7|
Cloudflare Pro|cloudflare-pro|https://dash.cloudflare.com|https://dash.cloudflare.com/profile/billing|easy|productivity|20|
Supabase Pro|supabase-pro|https://app.supabase.com|https://app.supabase.com/account/billing|easy|productivity|25|
PlanetScale|planetscale|https://app.planetscale.com|https://app.planetscale.com/settings/billing|easy|productivity|39|
Sentry|sentry|https://sentry.io|https://sentry.io/settings/billing/overview|easy|productivity|26|
Postman|postman|https://web.postman.co|https://web.postman.co/billing|easy|productivity|14|
Insomnia|insomnia|https://insomnia.rest|https://insomnia.rest/pricing|easy|productivity|8|
Xbox Game Pass Ultimate|xbox-game-pass-ultimate|https://www.xbox.com/xbox-game-pass|https://account.microsoft.com/services|medium|gaming|17|
PlayStation Plus|playstation-plus|https://www.playstation.com/en-us/playstation-plus|https://www.playstation.com/en-us/playstation-plus/manage|medium|gaming|18|
Nintendo Switch Online|nintendo-switch-online|https://www.nintendo.com/switch/online|https://accounts.nintendo.com/subscription|easy|gaming|4|
EA Play Pro|ea-play-pro|https://www.ea.com/ea-play|https://www.ea.com/ea-play/cancel|easy|gaming|15|
Ubisoft Plus|ubisoft-plus|https://store.ubisoft.com/us/ubisoftplus|https://store.ubisoft.com/us/ubisoftplus|easy|gaming|18|
Apple Arcade|apple-arcade|https://www.apple.com/apple-arcade|https://support.apple.com/en-us/118428|easy|gaming|7|
Google Play Pass|google-play-pass|https://play.google.com/store/pass|https://play.google.com/store/account/subscriptions|easy|gaming|5|
Steam|steam|https://store.steampowered.com|https://store.steampowered.com/account/subscriptions|easy|gaming||
Humble Bundle|humble-bundle|https://www.humblebundle.com|https://www.humblebundle.com/membership|easy|gaming|12|
Discord Nitro|discord-nitro|https://discord.com|https://discord.com/settings/subscriptions|easy|gaming|10|
Twitch Prime|twitch-prime|https://gaming.amazon.com|https://gaming.amazon.com/settings/prime-gaming|easy|gaming||
Roblox Premium|roblox-premium|https://www.roblox.com|https://www.roblox.com/settings|easy|gaming|6|
GeForce NOW|geforce-now|https://www.nvidia.com/en-us/geforce-now|https://www.nvidia.com/en-us/geforce-now/my-account|easy|gaming|10|
Xbox Live Gold|xbox-live-gold|https://www.xbox.com/live/gold|https://account.microsoft.com/services|medium|gaming|10|
Crunchyroll Premium|crunchyroll-premium|https://www.crunchyroll.com|https://www.crunchyroll.com/account/membership|easy|gaming|8|
Peloton|peloton|https://members.onepeloton.com|https://members.onepeloton.com/profile/billing|medium|health|44|
Headspace|headspace|https://www.headspace.com|https://www.headspace.com/account|medium|health|13|
Calm|calm|https://www.calm.com|https://www.calm.com/account|medium|health|15|
Noom|noom|https://web.noom.com|https://web.noom.com/settings/account|hard|health|60|
MyFitnessPal Premium|myfitnesspal-premium|https://www.myfitnesspal.com|https://www.myfitnesspal.com/account/manage_subscription|medium|health|20|
Whoop|whoop|https://www.whoop.com|https://www.whoop.com/account|medium|health|30|
Eight Sleep|eight-sleep|https://eightsleep.com|https://eightsleep.com/account|hard|health|19|
Fitbit Premium|fitbit-premium|https://www.fitbit.com|https://www.fitbit.com/settings/premium|easy|health|10|
Nike Training Club|nike-training-club|https://www.nike.com|https://www.nike.com/membership/cancel|easy|health|15|
Strava Premium|strava-premium|https://www.strava.com|https://www.strava.com/settings/subscription|easy|health|11|
AllTrails Pro|alltrails-pro|https://www.alltrails.com|https://www.alltrails.com/account|easy|health||36
Zwift|zwift|https://my.zwift.com|https://my.zwift.com/profile/subscription|easy|health|15|
Hinge Preferred|hinge-preferred|https://hinge.co|https://hinge.co/settings|medium|health|33|
Tinder Gold|tinder-gold|https://tinder.com|https://tinder.com/account/manage-billing|dark_pattern|health|30|
Bumble Boost|bumble-boost|https://bumble.com|https://bumble.com/en/subscription|medium|health|25|
Weight Watchers|weight-watchers|https://www.weightwatchers.com|https://www.weightwatchers.com/us/account|hard|health|23|
Beachbody|beachbody|https://www.beachbodyondemand.com|https://www.beachbodyondemand.com/account|hard|health|39|
ClassPass|classpass|https://classpass.com|https://classpass.com/account|medium|health|30|
Equinox+|equinox-plus|https://equinoxplus.com|https://equinoxplus.com/account|hard|health|40|
Future Fitness|future-fitness|https://www.future.co|https://www.future.co/account|medium|health|150|
YNAB|ynab|https://app.ynab.com|https://app.ynab.com/settings|easy|finance|15|
Monarch Money|monarch-money|https://app.monarchmoney.com|https://app.monarchmoney.com/settings/subscription|easy|finance|15|
Copilot|copilot-money|https://copilot.money|https://copilot.money/settings|easy|finance|13|
Personal Capital Premium|personal-capital-premium|https://home.personalcapital.com|https://home.personalcapital.com/app/settings|medium|finance||
Quicken|quicken|https://www.quicken.com|https://www.quicken.com/support/cancel|medium|finance|6|
TurboTax|turbotax|https://turbotax.intuit.com|https://myturbotax.intuit.com|easy|finance||
Credit Karma|credit-karma|https://www.creditkarma.com|https://www.creditkarma.com/settings|easy|finance||
Experian Boost|experian-boost|https://www.experian.com|https://www.experian.com/membership|easy|finance|25|
LifeLock|lifelock|https://www.lifelock.com|https://www.lifelock.com/my-account|hard|finance|9|
Identity Guard|identity-guard|https://www.identityguard.com|https://www.identityguard.com/account|medium|finance|9|
Robinhood Gold|robinhood-gold|https://robinhood.com|https://robinhood.com/account/gold|easy|finance|5|
Webull Premium|webull-premium|https://www.webull.com|https://www.webull.com/account|easy|finance|10|
Acorns|acorns|https://app.acorns.com|https://app.acorns.com/settings|easy|finance|3|
Betterment|betterment|https://www.betterment.com|https://www.betterment.com/app/settings/billing|easy|finance||
Wealthfront|wealthfront|https://www.wealthfront.com|https://www.wealthfront.com/dashboard/settings|easy|finance||
Duolingo Plus|duolingo-plus|https://www.duolingo.com|https://www.duolingo.com/settings/subscription|easy|education|7|
Coursera Plus|coursera-plus|https://www.coursera.org|https://www.coursera.org/account-settings/subscriptions|medium|education|59|
LinkedIn Learning|linkedin-learning|https://www.linkedin.com/learning|https://www.linkedin.com/learning/settings|medium|education|40|
Skillshare|skillshare|https://www.skillshare.com|https://www.skillshare.com/settings/membership|easy|education|32|
Masterclass|masterclass|https://www.masterclass.com|https://www.masterclass.com/account/settings|medium|education||120
Audible|audible|https://www.audible.com|https://www.audible.com/account/memberships|medium|education|15|
Kindle Unlimited|kindle-unlimited|https://www.amazon.com/kindle-dbs/hz/subscribe/ku|https://www.amazon.com/kindle-dbs/submanager|easy|education|12|
Blinkist|blinkist|https://www.blinkist.com|https://www.blinkist.com/en/app/settings|medium|education|16|
Brilliant|brilliant|https://brilliant.org|https://brilliant.org/settings/billing|easy|education|15|
Khan Academy|khan-academy|https://www.khanacademy.org|https://www.khanacademy.org/profile/me|easy|education||
Udemy|udemy|https://www.udemy.com|https://www.udemy.com/user/edit-account|easy|education||
Pluralsight|pluralsight|https://app.pluralsight.com|https://app.pluralsight.com/id/settings/billing|medium|education|29|
Codecademy Pro|codecademy-pro|https://www.codecademy.com|https://www.codecademy.com/account/billing|easy|education|18|
DataCamp|datacamp|https://www.datacamp.com|https://www.datacamp.com/settings/subscription|easy|education|25|
O'Reilly Learning|oreilly-learning|https://learning.oreilly.com|https://learning.oreilly.com/accounts/settings|medium|education|50|
Pimsleur|pimsleur|https://www.pimsleur.com|https://www.pimsleur.com/account|easy|education|15|
Babbel|babbel|https://my.babbel.com|https://my.babbel.com/subscription|easy|education|14|
Rosetta Stone|rosetta-stone|https://www.rosettastone.com|https://www.rosettastone.com/account|medium|education|12|
Chegg|chegg|https://www.chegg.com|https://www.chegg.com/settings|medium|education|16|
Quizlet Plus|quizlet-plus|https://quizlet.com|https://quizlet.com/settings/subscriptions|easy|education|8|
Spotify Premium|spotify-premium|https://www.spotify.com|https://www.spotify.com/account/subscription/cancel|medium|music|10|
Apple Music|apple-music|https://music.apple.com|https://support.apple.com/en-us/118428|easy|music|11|
YouTube Music|youtube-music|https://music.youtube.com|https://myaccount.google.com/payments-and-subscriptions|easy|music|11|
Tidal|tidal|https://tidal.com|https://account.tidal.com/subscription|easy|music|11|
Amazon Music Unlimited|amazon-music-unlimited|https://music.amazon.com|https://www.amazon.com/settings/musicsubscriptions|easy|music|9|
Deezer Premium|deezer-premium|https://www.deezer.com|https://www.deezer.com/account|easy|music|11|
Pandora Plus|pandora-plus|https://www.pandora.com|https://www.pandora.com/account/settings|easy|music|5|
SoundCloud Go|soundcloud-go|https://soundcloud.com|https://soundcloud.com/settings/subscription|easy|music|10|
Bandcamp|bandcamp|https://bandcamp.com|https://bandcamp.com/account_settings|easy|music||
Beatport|beatport|https://www.beatport.com|https://www.beatport.com/my-beatport/settings|easy|music|10|
iHeartRadio All Access|iheartradio-all-access|https://www.iheart.com|https://www.iheart.com/account|easy|music|10|
LiveOne|liveone|https://liveone.com|https://liveone.com/account|easy|music|5|
Qobuz|qobuz|https://www.qobuz.com|https://www.qobuz.com/account|easy|music|11|
Napster|napster|https://account.napster.com|https://account.napster.com/settings|easy|music|10|
Zing MP3|zing-mp3|https://zingmp3.vn|https://zingmp3.vn/account|easy|music|2|
iCloud+|icloud-plus|https://www.icloud.com|https://support.apple.com/en-us/108353|easy|cloud|1|
Google One|google-one|https://one.google.com|https://one.google.com/storage|easy|cloud|2|
Microsoft OneDrive|microsoft-onedrive|https://www.microsoft.com/microsoft-365/onedrive|https://account.microsoft.com/services|medium|cloud|2|
Backblaze|backblaze|https://www.backblaze.com|https://www.backblaze.com/user_signin.htm|easy|cloud|9|
Carbonite|carbonite|https://www.carbonite.com|https://www.carbonite.com/account|medium|cloud|6|
IDrive|idrive|https://www.idrive.com|https://www.idrive.com/account|easy|cloud|4|
NordPass|nordpass|https://my.nordaccount.com|https://my.nordaccount.com|easy|security|2|
Dashlane|dashlane|https://app.dashlane.com|https://app.dashlane.com/settings/subscription|medium|security|5|
Keeper Security|keeper-security|https://keepersecurity.com|https://keepersecurity.com/vault#account|easy|security|3|
McAfee Total Protection|mcafee-total-protection|https://www.mcafee.com|https://account.mcafee.com/en-us/account/subscriptions|hard|security||40
Norton 360|norton-360|https://my.norton.com|https://my.norton.com/extspa/index#/subscriptions|hard|security||40
Malwarebytes Premium|malwarebytes-premium|https://my.malwarebytes.com|https://my.malwarebytes.com/subscriptions|easy|security|4|
Avast Premium|avast-premium|https://www.avast.com|https://www.avast.com/en-us/store|medium|security|4|
ProtonMail Plus|protonmail-plus|https://account.proton.me|https://account.proton.me/dashboard|easy|security|4|
Tutanota Premium|tutanota-premium|https://mail.tutanota.com|https://mail.tutanota.com/settings/subscription|easy|security|3|
Mullvad VPN|mullvad-vpn|https://mullvad.net|https://mullvad.net/en/account|easy|security|5|
ProtonVPN Plus|protonvpn-plus|https://account.proton.me|https://account.proton.me/dashboard|easy|security|8|
Fastmail|fastmail|https://www.fastmail.com|https://www.fastmail.com/settings/billing|easy|cloud|5|
Hey Email|hey-email|https://app.hey.com|https://app.hey.com/account/billing|easy|cloud|10|
SimpleLogin|simplelogin|https://app.simplelogin.io|https://app.simplelogin.io/dashboard/setting|easy|security|4|
`;
const expansionRows = `
Starz|streaming|https://www.starz.com|9.99
Showtime|streaming|https://www.showtime.com|10.99
MGM+|streaming|https://www.mgmplus.com|6.99
Acorn TV|streaming|https://acorn.tv|7.99
Shudder|streaming|https://www.shudder.com|6.99
BET+|streaming|https://www.bet.plus|10.99
Hallmark Movies Now|streaming|https://www.hmnow.com|5.99
Lifetime Movie Club|streaming|https://www.lifetimemovieclub.com|4.99
PBS Passport|streaming|https://www.pbs.org/passport|5
Curiosity Stream|streaming|https://curiositystream.com|4.99
Nebula|streaming|https://nebula.tv|5
Viki Pass|streaming|https://www.viki.com|4.99
Rakuten Viki|streaming|https://www.viki.com|4.99
Viaplay|streaming|https://viaplay.com|5.99
DAZN|streaming|https://www.dazn.com|19.99
ESPN+|streaming|https://www.espn.com/espnplus|10.99
NFL+|streaming|https://www.nfl.com/plus|6.99
NBA League Pass|streaming|https://www.nba.com/watch/league-pass-stream|14.99
MLB.TV|streaming|https://www.mlb.com/live-stream-games/subscribe|24.99
NHL.TV|streaming|https://www.nhl.com/tv|14.99
Bally Sports+|streaming|https://www.ballysports.com/packages|19.99
FloSports|streaming|https://www.flosports.tv|29.99
Gaia|streaming|https://www.gaia.com|11.99
Kanopy|streaming|https://www.kanopy.com|
Plex Pass|streaming|https://www.plex.tv/plex-pass|4.99
Dropout|streaming|https://www.dropout.tv|5.99
WOW Presents Plus|streaming|https://www.wowpresentsplus.com|4.99
Wondrium|streaming|https://www.wondrium.com|20
Angel Studios Guild|streaming|https://www.angel.com/guild|12
Pure Flix|streaming|https://www.pureflix.com|7.99
Gemini Advanced|ai_tools|https://gemini.google.com|19.99
Microsoft Copilot Pro|ai_tools|https://copilot.microsoft.com|20
Poe|ai_tools|https://poe.com|19.99
Phind Pro|ai_tools|https://www.phind.com|20
You.com Pro|ai_tools|https://you.com|15
Kagi Assistant|ai_tools|https://kagi.com|10
Tabnine|ai_tools|https://www.tabnine.com|12
Codeium Pro|ai_tools|https://codeium.com|10
Sourcegraph Cody Pro|ai_tools|https://sourcegraph.com/cody|9
Mutable AI|ai_tools|https://mutable.ai|25
Blackbox AI|ai_tools|https://www.blackbox.ai|10
Gamma|ai_tools|https://gamma.app|10
Beautiful.ai|ai_tools|https://www.beautiful.ai|12
Tome|ai_tools|https://tome.app|20
Krea AI|ai_tools|https://www.krea.ai|10
Ideogram|ai_tools|https://ideogram.ai|8
Magnific AI|ai_tools|https://magnific.ai|39
Topaz Photo AI|ai_tools|https://www.topazlabs.com|17
Topaz Video AI|ai_tools|https://www.topazlabs.com|25
Kaiber|ai_tools|https://kaiber.ai|10
Luma Dream Machine|ai_tools|https://lumalabs.ai|10
Scenario|ai_tools|https://www.scenario.com|15
Civitai Supporter|ai_tools|https://civitai.com|5
PlayHT|ai_tools|https://play.ht|31.2
Murf AI|ai_tools|https://murf.ai|23
Resemble AI|ai_tools|https://www.resemble.ai|29
Rask AI|ai_tools|https://www.rask.ai|60
Krisp|ai_tools|https://krisp.ai|8
Fireflies.ai|ai_tools|https://fireflies.ai|18
Fathom|ai_tools|https://fathom.video|19
tl;dv|ai_tools|https://tldv.io|20
SaneBox|ai_tools|https://www.sanebox.com|7
TextCortex|ai_tools|https://textcortex.com|7
Rytr|ai_tools|https://rytr.me|9
QuillBot|ai_tools|https://quillbot.com|9.95
Wordtune|ai_tools|https://www.wordtune.com|13.99
Frase|ai_tools|https://www.frase.io|15
Surfer SEO|ai_tools|https://surferseo.com|89
NeuronWriter|ai_tools|https://neuronwriter.com|23
Todoist Pro|productivity|https://todoist.com|5
Things Cloud|productivity|https://culturedcode.com/things|0
TickTick Premium|productivity|https://ticktick.com|3
Evernote|productivity|https://evernote.com|14.99
Obsidian Sync|productivity|https://obsidian.md|5
Roam Research|productivity|https://roamresearch.com|15
Craft Docs|productivity|https://www.craft.do|10
Bear Pro|productivity|https://bear.app|2.99
Ulysses|productivity|https://ulysses.app|5.99
Scrivener|productivity|https://www.literatureandlatte.com/scrivener|
Basecamp|productivity|https://basecamp.com|15
Height|productivity|https://height.app|8.5
Shortcut|productivity|https://shortcut.com|8.5
Wrike|productivity|https://www.wrike.com|9.8
Smartsheet|productivity|https://www.smartsheet.com|9
Teamwork|productivity|https://www.teamwork.com|8.99
Hive|productivity|https://hive.com|5
ProofHub|productivity|https://www.proofhub.com|45
Lucidchart|productivity|https://www.lucidchart.com|7.95
FigJam|productivity|https://www.figma.com/figjam|5
Whimsical|productivity|https://whimsical.com|10
Balsamiq Cloud|productivity|https://balsamiq.cloud|9
Typeform|productivity|https://www.typeform.com|29
Jotform|productivity|https://www.jotform.com|39
Calendly|productivity|https://calendly.com|12
Acuity Scheduling|productivity|https://acuityscheduling.com|20
Calendars by Readdle|productivity|https://readdle.com/calendars|2.99
Spark Mail Premium|productivity|https://sparkmailapp.com|4.99
CleanMyMac|productivity|https://macpaw.com/cleanmymac|3.33
Setapp|productivity|https://setapp.com|9.99
Mimestream|productivity|https://mimestream.com|4.99
Raycast Pro|productivity|https://www.raycast.com|8
TextExpander|productivity|https://textexpander.com|3.33
Alfred Powerpack|productivity|https://www.alfredapp.com|
Paste|productivity|https://pasteapp.io|2.99
Notability Plus|productivity|https://notability.com|2.99
Goodnotes Pro|productivity|https://www.goodnotes.com|2.99
PDF Expert Premium|productivity|https://pdfexpert.com|6.67
Smallpdf Pro|productivity|https://smallpdf.com|12
DocuSign|productivity|https://www.docusign.com|10
Minecraft Realms|gaming|https://www.minecraft.net/realms|7.99
World of Warcraft|gaming|https://worldofwarcraft.blizzard.com|14.99
Final Fantasy XIV|gaming|https://www.finalfantasyxiv.com|12.99
Elder Scrolls Online Plus|gaming|https://www.elderscrollsonline.com|14.99
RuneScape Membership|gaming|https://www.runescape.com|12.49
Old School RuneScape|gaming|https://oldschool.runescape.com|12.49
Fortnite Crew|gaming|https://www.fortnite.com/fortnite-crew|11.99
GTA+|gaming|https://www.rockstargames.com/gta-plus|7.99
PUBG Plus|gaming|https://pubg.com|12.99
Meta Quest+|gaming|https://www.meta.com/quest/meta-quest-plus|7.99
Shadow PC|gaming|https://shadow.tech|29.99
Boosteroid|gaming|https://boosteroid.com|9.89
Antstream Arcade|gaming|https://www.antstream.com|4.99
GameClub|gaming|https://gameclub.io|4.99
Parsec Warp|gaming|https://parsec.app|9.99
Roll20 Plus|gaming|https://roll20.net|5.99
D&D Beyond Master Tier|gaming|https://www.dndbeyond.com|5.99
Foundry VTT Forge|gaming|https://forge-vtt.com|4.49
Chess.com Premium|gaming|https://www.chess.com|5
Lichess Patron|gaming|https://lichess.org|5
Pokemon HOME Premium|gaming|https://home.pokemon.com|2.99
iRacing|gaming|https://www.iracing.com|13
Zwift Play|gaming|https://www.zwift.com|15
GameFly|gaming|https://www.gamefly.com|15.95
Aaptiv|health|https://aaptiv.com|14.99
Centr|health|https://centr.com|29.99
Fitbod|health|https://fitbod.me|12.99
Freeletics|health|https://www.freeletics.com|9.99
Nike Run Club|health|https://www.nike.com/nrc-app|
MapMyRun MVP|health|https://www.mapmyrun.com|5.99
Runna|health|https://runna.com|17.99
TrainerRoad|health|https://www.trainerroad.com|19.95
Garmin Connect+|health|https://www.garmin.com|6.99
Oura Membership|health|https://ouraring.com|5.99
Sleep Cycle Premium|health|https://www.sleepcycle.com|3.33
Rise Sleep|health|https://www.risescience.com|5.99
MySwimPro|health|https://myswimpro.com|19.99
Alo Moves|health|https://www.alomoves.com|12.99
YogaGlo|health|https://www.glo.com|30
Down Dog Yoga|health|https://www.downdogapp.com|9.99
Cronometer Gold|health|https://cronometer.com|8.99
Lose It Premium|health|https://www.loseit.com|3.33
Lifesum Premium|health|https://lifesum.com|8.33
Fastic Plus|health|https://fastic.com|12.99
Zero Plus|health|https://www.zerolongevity.com|9.99
Flo Premium|health|https://flo.health|7.99
Clue Plus|health|https://helloclue.com|3.99
Natural Cycles|health|https://www.naturalcycles.com|14.99
Talkspace|health|https://www.talkspace.com|69
Rocket Money Premium|finance|https://www.rocketmoney.com|6
Simplifi by Quicken|finance|https://www.quicken.com/products/simplifi|5.99
PocketGuard Plus|finance|https://pocketguard.com|7.99
EveryDollar Premium|finance|https://www.ramseysolutions.com/ramseyplus/everydollar|17.99
Tiller Money|finance|https://www.tillerhq.com|6.58
Kubera|finance|https://www.kubera.com|19
Lunch Money|finance|https://lunchmoney.app|10
Empower Personal Dashboard|finance|https://www.empower.com|
Stash|finance|https://www.stash.com|3
SoFi Plus|finance|https://www.sofi.com|
M1 Plus|finance|https://m1.com|10
TradingView Essential|finance|https://www.tradingview.com|14.95
Seeking Alpha Premium|finance|https://seekingalpha.com|19.99
Morningstar Investor|finance|https://www.morningstar.com|34.95
Motley Fool Stock Advisor|finance|https://www.fool.com|16.58
Benzinga Pro|finance|https://www.benzinga.com/pro|37
Koyfin Plus|finance|https://www.koyfin.com|39
Finimize|finance|https://www.finimize.com|10
WallStreetZen Premium|finance|https://www.wallstreetzen.com|19
Delta Investment Tracker|finance|https://delta.app|8.99
CoinTracker|finance|https://www.cointracker.io|4.99
Koinly|finance|https://koinly.io|4.08
TaxAct|finance|https://www.taxact.com|
H&R Block Online|finance|https://www.hrblock.com|
QuickBooks Self-Employed|finance|https://quickbooks.intuit.com|20
EdX|education|https://www.edx.org|
FutureLearn|education|https://www.futurelearn.com|39.99
CreativeLive|education|https://www.creativelive.com|12.42
Domestika Plus|education|https://www.domestika.org|9.99
Maven|education|https://maven.com|
Treehouse|education|https://teamtreehouse.com|25
Frontend Masters|education|https://frontendmasters.com|39
Educative|education|https://www.educative.io|16.66
AlgoExpert|education|https://www.algoexpert.io|12
LeetCode Premium|education|https://leetcode.com|35
Brilliant Premium|education|https://brilliant.org|15
Mimo Pro|education|https://mimo.org|9.99
Sololearn Pro|education|https://www.sololearn.com|12.99
Busuu Premium|education|https://www.busuu.com|13.95
Memrise|education|https://www.memrise.com|8.49
Lingoda|education|https://www.lingoda.com|69
italki|education|https://www.italki.com|
Cambly|education|https://www.cambly.com|49
Preply|education|https://preply.com|
The Economist Education|education|https://www.economist.com|19.99
NYTimes Games|education|https://www.nytimes.com/games|4.99
NYTimes Cooking|education|https://cooking.nytimes.com|5
Washington Post|education|https://www.washingtonpost.com|4
Financial Times|education|https://www.ft.com|39
SiriusXM|music|https://www.siriusxm.com|10.99
Nugs.net|music|https://www.nugs.net|12.99
Mixcloud Premium|music|https://www.mixcloud.com|7.99
TuneIn Premium|music|https://tunein.com|9.99
Audacy|music|https://www.audacy.com|
Anghami Plus|music|https://www.anghami.com|4.99
Boomplay Premium|music|https://www.boomplay.com|2.99
JioSaavn Pro|music|https://www.jiosaavn.com|3.99
Gaana Plus|music|https://gaana.com|3.99
Wynk Music|music|https://wynk.in/music|1.99
Resso Premium|music|https://www.resso.com|2.99
Audiomack Premium|music|https://audiomack.com|4.99
Idagio|music|https://www.idagio.com|9.99
Ultimate Guitar Pro|music|https://www.ultimate-guitar.com|9.99
Songsterr Plus|music|https://www.songsterr.com|9.99
Yousician|music|https://yousician.com|19.99
Simply Piano|music|https://www.hellosimply.com|19.99
Melodics|music|https://melodics.com|9.99
Splice Sounds|music|https://splice.com|12.99
Loopcloud|music|https://www.loopcloud.com|7.99
LANDR Studio|music|https://www.landr.com|12.5
DistroKid|music|https://distrokid.com|1.92
TuneCore|music|https://www.tunecore.com|
BeatStars Pro|music|https://www.beatstars.com|9.99
MEGA Pro|cloud|https://mega.io|10.99
pCloud Premium|cloud|https://www.pcloud.com|4.99
Sync.com|cloud|https://www.sync.com|8
Tresorit|cloud|https://tresorit.com|11.99
Koofr|cloud|https://koofr.eu|2
Jottacloud|cloud|https://www.jottacloud.com|9.9
Wasabi|cloud|https://wasabi.com|6.99
Dropbox Professional|cloud|https://www.dropbox.com|19.99
Box Personal Pro|cloud|https://www.box.com|10
Egnyte|cloud|https://www.egnyte.com|20
Nextcloud Enterprise|cloud|https://nextcloud.com|
Proton Drive|cloud|https://drive.proton.me|4.99
Zoho WorkDrive|cloud|https://www.zoho.com/workdrive|3
Adobe Creative Cloud Storage|cloud|https://account.adobe.com|9.99
SmugMug|cloud|https://www.smugmug.com|13
Flickr Pro|cloud|https://www.flickr.com|8.25
Google Photos Storage|cloud|https://one.google.com|2
Amazon Photos|cloud|https://www.amazon.com/photos|
Synology C2|cloud|https://c2.synology.com|6.99
Acronis Cyber Protect|cloud|https://www.acronis.com|9.99
Arq Premium|cloud|https://www.arqbackup.com|5.99
SpiderOak One|cloud|https://spideroak.com|6
CrashPlan|cloud|https://www.crashplan.com|10
OpenDrive|cloud|https://www.opendrive.com|9.95
MediaFire Pro|cloud|https://www.mediafire.com|5
Proton Unlimited|security|https://account.proton.me|12.99
IVPN|security|https://www.ivpn.net|6
Private Internet Access|security|https://www.privateinternetaccess.com|11.95
CyberGhost VPN|security|https://www.cyberghostvpn.com|12.99
TunnelBear|security|https://www.tunnelbear.com|9.99
Windscribe Pro|security|https://windscribe.com|9
1Password Families|security|https://my.1password.com|4.99
Bitwarden Families|security|https://vault.bitwarden.com|3.33
Dashlane Friends & Family|security|https://app.dashlane.com|7.49
RoboForm Everywhere|security|https://www.roboform.com|1.99
Enpass Premium|security|https://www.enpass.io|2.99
ESET Home Security|security|https://www.eset.com|4.99
Bitdefender Total Security|security|https://www.bitdefender.com|4.17
Kaspersky Premium|security|https://usa.kaspersky.com|4.99
TotalAV|security|https://www.totalav.com|8.99
Aura|security|https://www.aura.com|12
DeleteMe|security|https://joindeleteme.com|10.75
Incogni|security|https://incogni.com|12.99
Privacy Bee|security|https://privacybee.com|16.67
IronVest|security|https://ironvest.com|5
AnonAddy|security|https://addy.io|1
Firefox Relay Premium|security|https://relay.firefox.com|0.99
Mailfence|security|https://mailfence.com|3.5
StartMail|security|https://www.startmail.com|5
Hushmail|security|https://www.hushmail.com|9.99
Patreon|other|https://www.patreon.com|5
Ko-fi Gold|other|https://ko-fi.com|6
OnlyFans|other|https://onlyfans.com|
Medium Membership|other|https://medium.com|5
WordPress.com|other|https://wordpress.com|4
Squarespace|other|https://www.squarespace.com|16
Wix Premium|other|https://www.wix.com|17
Ghost Pro|other|https://ghost.org|9
Carrd Pro|other|https://carrd.co|1.58
Linktree Pro|other|https://linktr.ee|5
Beacons|other|https://beacons.ai|10
Shopify Basic|other|https://www.shopify.com|39
Etsy Plus|other|https://www.etsy.com|10
eBay Store|other|https://www.ebay.com|4.95
Amazon Seller|other|https://sellercentral.amazon.com|39.99
Instacart+|other|https://www.instacart.com|9.99
Walmart+|other|https://www.walmart.com/plus|12.95
DoorDash DashPass|other|https://www.doordash.com/dashpass|9.99
Uber One|other|https://www.uber.com/uber-one|9.99
Lyft Pink|other|https://www.lyft.com/memberships/lyft-pink|9.99
Grubhub+|other|https://www.grubhub.com/plus|9.99
Costco Membership|other|https://www.costco.com|5
Sam's Club|other|https://www.samsclub.com|4.17
AAA Membership|other|https://www.aaa.com|5
`;
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/\+/g, " plus ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function colorForSlug(slug) {
    const sum = [...slug].reduce((total, char) => total + char.charCodeAt(0), 0);
    return logoColors[sum % logoColors.length] ?? logoColors[0];
}
function defaultCancelGuide(name) {
    return [
        `Go to ${name} and sign in`,
        "Open Account, Profile, or Settings",
        "Choose Billing, Plan, Membership, or Subscription",
        "Select Cancel, Manage subscription, or Turn off auto-renew",
        "Confirm cancellation and save the confirmation email or screen"
    ];
}
function parsePrice(value) {
    if (!value || value.toLowerCase() === "null") {
        return null;
    }
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
}
function parseRequestedRows(rows) {
    return rows
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((row) => {
        const [name, slug, website, cancelUrl, cancelDifficulty, category, monthly, annual] = row.split("|").map((part) => part.trim());
        if (!name || !slug || !website || !cancelUrl || !cancelDifficulty || !category) {
            throw new Error(`Invalid service catalog row: ${row}`);
        }
        const input = {
            name,
            slug,
            website,
            cancelUrl,
            cancelDifficulty: cancelDifficulty,
            category: category,
            defaultMonthlyPrice: parsePrice(monthly),
            defaultAnnualPrice: parsePrice(annual)
        };
        const guide = guideOverrides[slug];
        if (guide) {
            input.cancelGuide = guide;
        }
        return input;
    });
}
function parseExpansionRows(rows) {
    return rows
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((row) => {
        const [name, category, website, monthly] = row.split("|").map((part) => part.trim());
        if (!name || !category || !website) {
            throw new Error(`Invalid service catalog expansion row: ${row}`);
        }
        return {
            name,
            website,
            cancelUrl: `${website.replace(/\/$/, "")}/account`,
            cancelDifficulty: "medium",
            category: category,
            defaultMonthlyPrice: parsePrice(monthly),
            defaultAnnualPrice: null
        };
    });
}
function defineServices(inputs) {
    return inputs.map((input) => {
        const slug = input.slug ?? slugify(input.name);
        return {
            id: input.id ?? slug,
            name: input.name,
            slug,
            logoColor: input.logoColor ?? colorForSlug(slug),
            website: input.website,
            cancelUrl: input.cancelUrl,
            cancelDifficulty: input.cancelDifficulty,
            category: input.category,
            defaultMonthlyPrice: input.defaultMonthlyPrice ?? null,
            defaultAnnualPrice: input.defaultAnnualPrice ?? null,
            freeTrialDays: input.freeTrialDays ?? null,
            cancelGuide: input.cancelGuide ?? defaultCancelGuide(input.name),
            supportEmail: input.supportEmail ?? null,
            supportPhone: input.supportPhone ?? null
        };
    });
}
function uniqueBySlug(items) {
    const seen = new Set();
    const unique = [];
    for (const item of items) {
        if (!seen.has(item.slug)) {
            seen.add(item.slug);
            unique.push(item);
        }
    }
    return unique;
}
export const services = uniqueBySlug([
    ...defineServices(parseRequestedRows(requestedRows)),
    ...defineServices(parseExpansionRows(expansionRows))
]);
const categoryMap = {
    streaming: "entertainment",
    ai_tools: "ai_tools",
    productivity: "productivity",
    gaming: "entertainment",
    health: "health",
    finance: "finance",
    education: "education",
    music: "entertainment",
    cloud: "productivity",
    security: "productivity",
    other: "other"
};
export function toSubscriptionCategory(category) {
    return categoryMap[category];
}
export function parsePriceToMinorUnits(value) {
    const text = String(value).trim();
    const negative = text.startsWith("-");
    const unsigned = negative ? text.slice(1) : text;
    const [wholeText = "", fractionText = ""] = unsigned.split(".");
    const whole = Number.parseInt(wholeText === "" ? "0" : wholeText, 10);
    const cents = Number.parseInt(`${fractionText}00`.slice(0, 2), 10);
    const amountMinor = whole * 100 + cents;
    return negative ? -amountMinor : amountMinor;
}
function toMoney(value) {
    return value === null ? undefined : { amountMinor: parsePriceToMinorUnits(value), currency: "USD" };
}
export function toServiceRecord(service) {
    let supportContact;
    if (service.supportEmail || service.supportPhone) {
        supportContact = {};
        if (service.supportEmail) {
            supportContact.email = service.supportEmail;
        }
        if (service.supportPhone) {
            supportContact.phone = service.supportPhone;
        }
    }
    const record = {
        id: `svc_${service.slug}`,
        createdAt: now,
        updatedAt: now,
        version: 1,
        slug: service.slug,
        name: service.name,
        website: service.website,
        category: toSubscriptionCategory(service.category),
        cancellationUrl: service.cancelUrl,
        cancellationDifficulty: service.cancelDifficulty,
        cancellationGuideSteps: service.cancelGuide
    };
    const defaultMonthlyPrice = toMoney(service.defaultMonthlyPrice);
    const defaultAnnualPrice = toMoney(service.defaultAnnualPrice);
    if (defaultMonthlyPrice) {
        record.defaultMonthlyPrice = defaultMonthlyPrice;
    }
    if (defaultAnnualPrice) {
        record.defaultAnnualPrice = defaultAnnualPrice;
    }
    if (service.freeTrialDays !== null) {
        record.freeTrialDays = service.freeTrialDays;
    }
    if (supportContact) {
        record.supportContact = supportContact;
    }
    return record;
}
export const serviceRecords = services.map(toServiceRecord);
export function getServiceById(id) {
    return services.find((service) => service.id === id);
}
export function getServiceBySlug(slug) {
    return services.find((service) => service.slug === slug);
}
export function searchServices(query, limit) {
    const resultLimit = limit ?? 15;
    if (!query || query.length < 1) {
        return services.slice(0, limit ?? 20);
    }
    const q = query.toLowerCase();
    return services
        .map((service) => ({ service, score: scoreService(service, q) }))
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name))
        .slice(0, resultLimit)
        .map((result) => result.service);
}
function scoreService(service, query) {
    const haystack = `${service.name} ${service.slug} ${service.category}`.toLowerCase();
    if (service.slug === query || service.name.toLowerCase() === query) {
        return 100;
    }
    if (service.name.toLowerCase().startsWith(query)) {
        return 75;
    }
    if (haystack.includes(query)) {
        return 50;
    }
    return fuzzyIncludes(service.name.toLowerCase(), query) ? 25 : 0;
}
function fuzzyIncludes(value, query) {
    let cursor = 0;
    for (const char of query) {
        cursor = value.indexOf(char, cursor);
        if (cursor === -1) {
            return false;
        }
        cursor += 1;
    }
    return true;
}
export function getServicesByCategory(category) {
    return services.filter((service) => service.category === category);
}
export function getPopularServices() {
    const popularIds = [
        "netflix",
        "spotify",
        "chatgpt-plus",
        "midjourney",
        "adobe-creative-cloud",
        "notion",
        "github-copilot",
        "figma",
        "claude-pro",
        "cursor-pro",
        "discord-nitro",
        "youtube-premium"
    ];
    return popularIds.map((id) => services.find((service) => service.id === id)).filter(Boolean);
}
export function findServiceBySlug(slug) {
    const service = getServiceBySlug(slug);
    return service ? toServiceRecord(service) : undefined;
}
export function searchServiceRecords(query, limit = 10) {
    return searchServices(query, limit).map(toServiceRecord);
}
