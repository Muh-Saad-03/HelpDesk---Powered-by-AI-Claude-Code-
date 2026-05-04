// One-off seed: insert 100 diversified tickets so the list page has enough
// realistic data to exercise sorting and (eventually) filtering. Re-runnable
// only if the table is empty — guards against accidental duplication.
//
// Run from /server: `bun src/scripts/seedTickets.ts`

import { TicketCategory, TicketStatus } from "core";
import { prisma } from "../db.ts";

type SeedTicket = {
	subject: string;
	body: string;
	category: TicketCategory | null;
};

const general: SeedTicket[] = [
	{ subject: "How do I update my billing address?", body: "Just moved offices and need to change the address on my next invoice.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Can I change my plan mid-cycle?", body: "Looking to upgrade from Starter to Pro before the next renewal.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Where can I download past invoices?", body: "I need PDFs for the last six months for our finance team.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Adding teammates to my workspace", body: "What's the easiest way to invite five new people at once?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Annual vs monthly billing", body: "Curious whether annual really saves the 20% advertised on the pricing page.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Branding guidelines for partners", body: "Where can I find logos and brand assets we're allowed to use in our app?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Custom domain setup question", body: "Is there a guide for pointing our subdomain to your hosted dashboard?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Do you support SSO via Okta?", body: "We're rolling out SSO and need to confirm Okta is supported on our plan.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Export account data to CSV", body: "Need a one-time export of all our records for an internal audit.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Feature request: dark mode", body: "Half of my team works at night — dark mode would be a huge quality of life win.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "GDPR data subject access request", body: "A user has requested their personal data — what's your process?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "How does usage-based billing work?", body: "Trying to estimate next month's bill given our increased seat count.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Increasing API rate limits", body: "We're hitting 429s on the /events endpoint — how do we get a higher quota?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Is there a referral program?", body: "Friends keep asking me about your product. Anything I can share with them?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Moving billing to a different card", body: "Our company card was reissued — where do I update payment details?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Onboarding call availability", body: "I'd love a 30-minute walkthrough for my new hires next week.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Pause subscription for the summer", body: "We're going on a hiring freeze July–August. Can we pause and resume?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Quarterly business review request", body: "Our procurement team would like a QBR with your CSM team.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Receipt formatting for accounting", body: "Our finance system rejects your receipts because the VAT line is missing.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Scheduling a product demo", body: "I'm evaluating tools for a new project — can someone walk me through?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Trial extension possible?", body: "Decision-maker is on PTO — would it be possible to extend the trial 7 days?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Upgrade from Starter to Team plan", body: "We've grown beyond 5 seats. What's the cleanest way to upgrade?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Volume discount for non-profits", body: "We're a registered 501(c)(3). Do you offer non-profit pricing?", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "What does the audit log capture?", body: "Compliance is asking what events are recorded and for how long.", category: TicketCategory.GENERAL_QUESTION },
	{ subject: "Where are your servers hosted?", body: "Our security review needs the data center region(s) you operate from.", category: TicketCategory.GENERAL_QUESTION },
];

const technical: SeedTicket[] = [
	{ subject: "Login page returns a 500 error", body: "Started about an hour ago — Chrome on macOS, every attempt fails.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Two-factor codes never arrive", body: "I've tried three times in the last 10 minutes. SMS just doesn't show up.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Dashboard charts blank on Safari 17", body: "Data loads in Chrome but Safari shows empty placeholders.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "API webhooks not firing", body: "We haven't received any deliveries in the last 6 hours despite events being created.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Bulk import fails on large CSV", body: "Anything over ~5k rows times out with a generic 'Import failed' toast.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "CSV export is missing a column", body: "The 'last_active' column is in the UI but not in the CSV export.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Date filter ignores the timezone", body: "Filtering 'today' returns yesterday's data — looks like UTC vs local mismatch.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Email notifications going to spam", body: "Our entire team has your sender domain quarantined by Google Workspace.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "File upload stuck at 99%", body: "PDFs over 10 MB freeze right at the end of the progress bar.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Graph data inconsistent across pages", body: "Same metric shows different totals on the Overview vs Reports tab.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "iOS app crashes on launch", body: "Latest TestFlight build crashes immediately after the splash screen.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Integration with Slack disconnected", body: "Our Slack channel has been silent — re-auth doesn't seem to fix it.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "JSON export contains malformed records", body: "About 1 in 50 records have a stray backslash that breaks JSON.parse.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Keyboard shortcuts don't work in Firefox", body: "Cmd+K opens the URL bar instead of your command menu.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Login redirect loop after password reset", body: "After resetting, every attempt bounces between /login and /dashboard.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Mobile sidebar doesn't dismiss", body: "Once opened on iPhone, tapping outside the sidebar doesn't close it.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Notifications duplicated 3–4x", body: "Every email I get arrives in triplicate — only on my account.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "OAuth callback throws redirect_uri_mismatch", body: "Set the URL exactly per docs but Google still rejects the callback.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Page crashes when filtering by tag", body: "The whole React tree blanks and the console shows 'Cannot read property of undefined'.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Quota usage shown as negative", body: "My usage page reads -2,431 tokens — clearly a bug in the meter.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Real-time updates not propagating", body: "WebSocket events stop arriving after about 90 seconds idle.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Search returns no results for known items", body: "I can navigate to /tickets/abc123 manually, but search for 'abc123' returns nothing.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Time zone in reports defaulted to UTC", body: "Despite my profile being on America/Los_Angeles, reports use UTC by default.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Upload UI shows wrong file size", body: "It claims a 4 MB image is 4,000 GB — clearly a unit conversion bug.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Webhook retries flooding our endpoint", body: "When our endpoint returns 5xx briefly, you retry every second instead of backing off.", category: TicketCategory.TECHNICAL_QUESTION },
	{ subject: "Zapier integration broken since update", body: "Triggers haven't fired since we updated the connector this morning.", category: TicketCategory.TECHNICAL_QUESTION },
];

const refund: SeedTicket[] = [
	{ subject: "Accidentally subscribed to annual plan", body: "I clicked the wrong button — meant monthly. Please refund the difference.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Billed twice for January", body: "I see two charges on my card on Jan 3 and Jan 15 for the same amount.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Cancel my subscription and refund", body: "We're moving off the platform. Please cancel and refund the unused portion.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Charged after free trial ended", body: "I cancelled within the trial window but still got charged the full $99.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Discount code wasn't applied at checkout", body: "I used WELCOME20 but the receipt shows full price. Looking for a refund of the difference.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Duplicate charge on October 4th", body: "Two identical $49.00 charges 90 seconds apart. Need one of them refunded.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Enterprise plan downgrade refund", body: "We downgraded but were billed pro-rated incorrectly. Need a partial refund.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Failed migration — refund this month", body: "Migration tool corrupted half our records and we couldn't use the product all month.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Got charged after I cancelled", body: "I cancelled on the 28th and was still billed on the 1st.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Half-month refund for outage", body: "The 4-day outage made the product unusable. Asking for a partial credit.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Invoice paid twice — wire and card", body: "We paid by wire transfer, then auto-pay also charged the card.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Just realized I've been on the wrong plan", body: "I never used Team features. Can I get the difference refunded for the past 3 months?", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Mistakenly upgraded to Pro tier", body: "Wanted Plus but selected Pro. Refund the upgrade delta please.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Need a full refund — wrong product", body: "I purchased thinking this was a different SaaS. Haven't used it. Asking for a full refund.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Overage fees were not warned", body: "I got hit with $200 in overages without any email alert. Disputing the charges.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Refund for unused seats this quarter", body: "We bought 10 seats but only used 4. Hoping for a credit on the unused 6.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Subscription renewed despite cancellation", body: "I cancelled in the UI but the renewal still went through.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Trial converted to paid by mistake", body: "Forgot to cancel before the trial ended. Asking for a one-time courtesy refund.", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Wrong tax was applied to invoice", body: "Our company is VAT-exempt and the invoice has 21% VAT. Refund the tax portion?", category: TicketCategory.REFUND_REQUEST },
	{ subject: "Yearly plan refund — going out of business", body: "We're shutting down the company. Need a refund of the unused 9 months.", category: TicketCategory.REFUND_REQUEST },
];

const feedback: SeedTicket[] = [
	{ subject: "Loving the new dashboard layout!", body: "Just wanted to say the redesign is so much cleaner. Great work.", category: null },
	{ subject: "Quick suggestion for the export modal", body: "Would be nice to remember the last selected format between sessions.", category: null },
	{ subject: "Found a typo in the docs", body: "On the API authentication page, 'recieve' should be 'receive'.", category: null },
	{ subject: "Idea: keyboard shortcut overlay", body: "A '?' overlay listing all shortcuts would help new users a lot.", category: null },
	{ subject: "Compliment for support team", body: "Sara on your support team was amazing yesterday. Please pass it on.", category: null },
];

const sources: { name: string | null; email: string }[] = [
	{ name: "Aaron Mitchell", email: "aaron.mitchell@northwind.example" },
	{ name: "Beatrice Knox", email: "bea@knoxcapital.example" },
	{ name: "Carlos Espinoza", email: "carlos@espinoza-arquitectos.example" },
	{ name: "Dana Cho", email: "dana.cho@hexalabs.example" },
	{ name: "Elliot Park", email: "elliot.park@parkside.example" },
	{ name: "Farah Haddad", email: "farah@levantine.example" },
	{ name: "Gabriel Rocha", email: "gabriel.rocha@brisa.example" },
	{ name: "Hana Watanabe", email: "h.watanabe@kintaro.example" },
	{ name: "Idris Lawal", email: "idris.lawal@oceanline.example" },
	{ name: "Julia Sørensen", email: "julia.s@nordlys.example" },
	{ name: "Kabir Mehta", email: "kabir@saffron-tech.example" },
	{ name: "Lena Moreau", email: "lena.moreau@chambord.example" },
	{ name: "Marcus O'Donnell", email: "marcus@odonnell.example" },
	{ name: "Nadia Petrova", email: "nadia.p@volga.example" },
	{ name: "Oscar Lindqvist", email: "oscar@lindqvist.example" },
	{ name: "Priya Iyer", email: "priya.iyer@mahalo.example" },
	{ name: "Quinn Beauregard", email: "quinn@beauregard.example" },
	{ name: "Rashid Al-Mansoori", email: "rashid@dunecorp.example" },
	{ name: "Sofia Castellanos", email: "sofia.c@laguna.example" },
	{ name: "Tomás Vieira", email: "tomas@vieira.example" },
	{ name: "Uma Bhattacharya", email: "uma.b@kalpana.example" },
	{ name: "Viktor Marchenko", email: "viktor@marchenko.example" },
	{ name: "Wren Halverson", email: "wren@halverson.example" },
	{ name: "Xochitl Ramirez", email: "xochitl@nopal.example" },
	{ name: "Yusuf Demir", email: "yusuf@bosphorus.example" },
	{ name: "Zoe Andreou", email: "zoe@andreou.example" },
	{ name: "Anika Schroeder", email: "anika@schroeder.example" },
	{ name: "Bryce Tanaka", email: "bryce.tanaka@mizu.example" },
	// A handful with no name to exercise the email-only render path.
	{ name: null, email: "support-ext-9921@triage.example" },
	{ name: null, email: "billing@acmewidgets.example" },
	{ name: null, email: "noreply@partner-system.example" },
	{ name: null, email: "ops-team@cloudgrove.example" },
];

// Deterministic interleaving so we get a balanced mix without RNG.
function buildAll(): SeedTicket[] {
	const all: SeedTicket[] = [];
	const pools = [general, technical, refund, feedback];
	const cursors = [0, 0, 0, 0];
	while (all.length < 100) {
		// Weight: 25 general / 25 tech / 20 refund / 5 feedback for the first
		// 75 picks, then loop the cycle to top up to exactly 100.
		for (let p = 0; p < pools.length && all.length < 100; p++) {
			const pool = pools[p]!;
			if (cursors[p]! < pool.length) {
				all.push(pool[cursors[p]!]!);
				cursors[p]!++;
			}
		}
		// Top up: cycle pools modulo their length so we go beyond unique entries.
		if (cursors.every((c, i) => c >= pools[i]!.length)) {
			for (let p = 0; p < pools.length && all.length < 100; p++) {
				const pool = pools[p]!;
				all.push(pool[(cursors[p]! - pool.length) % pool.length]!);
				cursors[p]!++;
			}
		}
	}
	return all.slice(0, 100);
}

const STATUSES: TicketStatus[] = [
	TicketStatus.OPEN, TicketStatus.OPEN, TicketStatus.OPEN, TicketStatus.OPEN, TicketStatus.OPEN,
	TicketStatus.RESOLVED, TicketStatus.RESOLVED, TicketStatus.RESOLVED,
	TicketStatus.CLOSED, TicketStatus.CLOSED,
];

const existing = await prisma.ticket.count();
console.log(`Tickets in DB before seed: ${existing}. Adding 100 more.`);

const seeds = buildAll();
const now = Date.now();
const SPAN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

const data = seeds.map((seed, i) => {
	const sender = sources[i % sources.length]!;
	const status = STATUSES[i % STATUSES.length]!;
	// Spread createdAt evenly across the past 60 days, plus a small per-row
	// jitter (in seconds) so timestamps don't collide.
	const createdAt = new Date(now - ((SPAN_MS * i) / seeds.length) - i * 137 * 1000);
	return {
		subject: seed.subject,
		body: seed.body,
		category: seed.category,
		status,
		fromEmail: sender.email,
		fromName: sender.name,
		createdAt,
	};
});

const result = await prisma.ticket.createMany({ data });
console.log(`Inserted ${result.count} tickets.`);

await prisma.$disconnect();
process.exit(0);
