const en = {
    // Header / Nav
    "nav.features": "Features",
    "nav.howItWorks": "How It Works",
    "nav.getStarted": "Get Started",

    // Hero
    "hero.tagline": "Track debts, stay clear.",
    "hero.title.line1": "Never Forget",
    "hero.title.line2": "Who Owes What",
    "hero.subtitle":
        "Tekyida is your personal IOU notebook — track debts between friends, family, and colleagues with multiple notebooks, all in Moroccan Dirhams.",
    "hero.cta.primary": "Start Tracking Free",
    "hero.cta.secondary": "See How It Works",

    // Features
    "features.sectionTag": "Why Tekyida?",
    "features.title": "Everything you need to settle up",
    "features.subtitle":
        "Inspired by Konnash & Karny — reimagined with a modern, clean experience.",
    "features.notebooks.title": "Multiple Notebooks",
    "features.notebooks.desc":
        "Separate your personal, business, and group debts into organized notebooks.",
    "features.currency.title": "Moroccan Dirhams",
    "features.currency.desc":
        "Native MAD currency support with clear positive/negative balance indicators.",
    "features.bilingual.title": "Bilingual FR / EN",
    "features.bilingual.desc":
        "Switch between French and English instantly — everything translates.",
    "features.cloud.title": "Cloud Synced",
    "features.cloud.desc":
        "Your data syncs securely in real-time across all your devices.",
    "features.pwa.title": "Works Offline",
    "features.pwa.desc":
        "Install as a mobile app. Track debts even without an internet connection.",
    "features.secure.title": "Secure Auth",
    "features.secure.desc":
        "Sign in with email & password or Google. Your data stays private.",

    // How It Works
    "howItWorks.sectionTag": "Simple as 1-2-3",
    "howItWorks.title": "Get started in seconds",
    "howItWorks.step1.title": "Create a Notebook",
    "howItWorks.step1.desc":
        "Name it — Personal, Business, Trip, whatever you need.",
    "howItWorks.step2.title": "Add People",
    "howItWorks.step2.desc":
        "Add the people you exchange money with. Optionally save their phone number.",
    "howItWorks.step3.title": "Log Transactions",
    "howItWorks.step3.desc":
        "Record who owes whom, how much, and why. Balances update instantly.",

    // CTA
    "cta.title": "Ready to settle up?",
    "cta.subtitle":
        "Join thousands tracking their IOUs with Tekyida. Free, fast, and beautiful.",
    "cta.button": "Create Your Free Account",

    // Footer
    "footer.tagline": "Track debts, keep friendships.",
    "footer.madeWith": "Made with",
    "footer.inMorocco": "in Morocco",
    "footer.rights": "All rights reserved.",
} as const;

export type TranslationKey = keyof typeof en;
export default en;
