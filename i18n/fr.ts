import type { TranslationKey } from "./en";

const fr: Record<TranslationKey, string> = {
    // Header / Nav
    "nav.features": "Fonctionnalités",
    "nav.howItWorks": "Comment ça marche",
    "nav.getStarted": "Commencer",

    // Hero
    "hero.tagline": "Suivez les dettes, restez clair.",
    "hero.title.line1": "N'oubliez Jamais",
    "hero.title.line2": "Qui Doit Quoi",
    "hero.subtitle":
        "Tekyida est votre carnet de dettes personnel — suivez les dettes entre amis, famille et collègues avec plusieurs carnets, le tout en Dirhams Marocains.",
    "hero.cta.primary": "Commencer Gratuitement",
    "hero.cta.secondary": "Voir Comment Ça Marche",

    // Features
    "features.sectionTag": "Pourquoi Tekyida ?",
    "features.title": "Tout ce qu'il faut pour régler vos comptes",
    "features.subtitle":
        "Inspiré de Konnash & Karny — réinventé avec une expérience moderne et épurée.",
    "features.notebooks.title": "Plusieurs Carnets",
    "features.notebooks.desc":
        "Séparez vos dettes personnelles, professionnelles et de groupe dans des carnets organisés.",
    "features.currency.title": "Dirhams Marocains",
    "features.currency.desc":
        "Support natif du MAD avec des indicateurs clairs de solde positif/négatif.",
    "features.bilingual.title": "Bilingue FR / EN",
    "features.bilingual.desc":
        "Basculez entre le français et l'anglais instantanément — tout se traduit.",
    "features.cloud.title": "Synchronisé Cloud",
    "features.cloud.desc":
        "Vos données se synchronisent en temps réel et en toute sécurité sur tous vos appareils.",
    "features.pwa.title": "Fonctionne Hors-Ligne",
    "features.pwa.desc":
        "Installez comme une application mobile. Suivez les dettes même sans connexion internet.",
    "features.secure.title": "Auth Sécurisée",
    "features.secure.desc":
        "Connectez-vous avec email et mot de passe ou Google. Vos données restent privées.",

    // How It Works
    "howItWorks.sectionTag": "Simple comme 1-2-3",
    "howItWorks.title": "Démarrez en quelques secondes",
    "howItWorks.step1.title": "Créez un Carnet",
    "howItWorks.step1.desc":
        "Nommez-le — Personnel, Business, Voyage, ce qu'il vous faut.",
    "howItWorks.step2.title": "Ajoutez des Personnes",
    "howItWorks.step2.desc":
        "Ajoutez les personnes avec qui vous échangez de l'argent. Optionnellement, sauvegardez leur numéro.",
    "howItWorks.step3.title": "Enregistrez les Transactions",
    "howItWorks.step3.desc":
        "Notez qui doit à qui, combien et pourquoi. Les soldes se mettent à jour instantanément.",

    // CTA
    "cta.title": "Prêt à régler vos comptes ?",
    "cta.subtitle":
        "Rejoignez les milliers qui suivent leurs dettes avec Tekyida. Gratuit, rapide et beau.",
    "cta.button": "Créer Votre Compte Gratuit",

    // Footer
    "footer.tagline": "Suivez les dettes, gardez les amitiés.",
    "footer.madeWith": "Fait avec",
    "footer.inMorocco": "au Maroc",
    "footer.rights": "Tous droits réservés.",

    // Login
    "login.title": "Bon Retour",
    "login.subtitle": "Connectez-vous à votre compte Tekyida pour gérer vos dettes.",
    "login.email": "Adresse email",
    "login.password": "Mot de passe",
    "login.submit": "Se Connecter",
    "login.noAccount": "Pas encore de compte ?",
    "login.register": "Créer un compte",
    "login.forgotPassword": "Mot de passe oublié ?",
    "login.error": "Email ou mot de passe invalide.",

    // Register
    "register.title": "Créer un Compte",
    "register.subtitle": "Rejoignez Tekyida et commencez à suivre vos dettes facilement.",
    "register.name": "Nom complet",
    "register.email": "Adresse email",
    "register.password": "Mot de passe",
    "register.confirmPassword": "Confirmer le mot de passe",
    "register.submit": "Créer le Compte",
    "register.hasAccount": "Déjà un compte ?",
    "register.login": "Se connecter",
    "register.error": "L'inscription a échoué. Veuillez réessayer.",
    "register.passwordMismatch": "Les mots de passe ne correspondent pas.",
    "register.passwordTooShort": "Le mot de passe doit contenir au moins 6 caractères.",

    // App Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.contacts": "Contacts",
    "nav.experiences": "Expériences",
    "nav.settings": "Paramètres",

    // Dashboard
    "dashboard.title": "Tableau de bord",
    "dashboard.empty.title": "Aucun carnet pour le moment",
    "dashboard.empty.subtitle": "Créez votre premier carnet pour commencer à suivre les dettes entre amis, famille ou collègues.",
    "dashboard.empty.cta": "Créer Votre Premier Carnet",
    "dashboard.stats.moneyGiven": "Argent Donné",
    "dashboard.stats.moneyOwed": "Argent à Recevoir",
    "dashboard.stats.balance": "Solde Net",
    "dashboard.loading": "Chargement...",

    // Notebook
    "notebook.select": "Choisir un Carnet",
    "notebook.add": "Ajouter un Carnet",
    "notebook.contacts": "contacts",
    "notebook.balance": "Solde",
    "notebook.delete": "Supprimer le Carnet",
    "notebook.deleteConfirm": "Supprimer ce carnet ainsi que tous ses contacts et transactions ? Cette action est irréversible.",
    "notebook.namePlaceholder": "Nom du carnet…",
    "notebook.edit": "Modifier le Carnet",
    "notebook.editName": "Nom du carnet",

    // Contact
    "contact.add": "Ajouter un Contact",
    "contact.name": "Nom du contact",
    "contact.phone": "Téléphone (optionnel)",
    "contact.empty": "Aucun contact",
    "contact.emptySubtitle": "Ajoutez votre premier contact pour commencer à suivre les transactions.",
    "contact.delete": "Supprimer le Contact",
    "contact.deleteConfirm": "Supprimer ce contact et toutes ses transactions ?",
    "contact.edit": "Modifier le Contact",

    // Experience
    "experience.add": "Ajouter une Expérience",
    "experience.name": "Nom de l'expérience",
    "experience.empty": "Aucune expérience",
    "experience.emptySubtitle": "Créez votre première expérience pour suivre les dépenses d'un voyage ou événement.",
    "experience.close": "Clôturer",
    "experience.reopen": "Rouvrir",
    "experience.closed": "Clôturé",
    "experience.open": "Ouvert",
    "experience.delete": "Supprimer l'Expérience",
    "experience.deleteConfirm": "Supprimer cette expérience et toutes ses transactions ? Cette action est irréversible.",
    "experience.edit": "Modifier l'Expérience",
    "experience.linkContact": "Lier à un contact",
    "experience.contactOptional": "Contact (optionnel)",
    "experience.noContact": "Aucun contact",
    "experience.transactions": "transactions",
    "experience.closedNotice": "Cette expérience est clôturée. Rouvrez-la pour faire des modifications.",
    "experience.totalBalance": "Solde Expériences Ouvertes",

    // Transaction
    "transaction.add": "Ajouter une Transaction",
    "transaction.amount": "Montant (MAD)",
    "transaction.description": "Description (optionnel)",
    "transaction.empty": "Aucune transaction",
    "transaction.theyOweYou": "Vous doit",
    "transaction.youOweThem": "Vous devez",
    "transaction.delete": "Supprimer",
    "transaction.deleteConfirm": "Supprimer cette transaction ? Cette action est irréversible.",
    "transaction.edit": "Modifier la Transaction",
    "transaction.date": "Date & Heure",

    // Common
    "common.cancel": "Annuler",
    "common.confirm": "Confirmer",
    "common.delete": "Supprimer",
    "common.save": "Enregistrer",
    "common.close": "Fermer",

    // Settings
    "settings.title": "Paramètres",
    "settings.account": "Compte",
    "settings.email": "Adresse email",
    "settings.confirmEmail": "Confirmer l'adresse email",
    "settings.password": "Mot de passe",
    "settings.newPassword": "Nouveau mot de passe",
    "settings.confirmPassword": "Confirmer le nouveau mot de passe",
    "settings.save": "Enregistrer",
    "settings.saveEmail": "Modifier l'email",
    "settings.emailChanged": "Email mis \u00e0 jour avec succ\u00e8s.",
    "settings.emailMismatch": "Les adresses email ne correspondent pas.",
    "settings.emailInvalid": "Veuillez entrer une adresse email valide.",
    "settings.emailChangeError": "\u00c9chec de la mise \u00e0 jour de l'email. Veuillez r\u00e9essayer.",
    "settings.savePassword": "Modifier le mot de passe",
    "settings.passwordChanged": "Mot de passe mis à jour avec succès.",
    "settings.passwordMismatch": "Les mots de passe ne correspondent pas.",
    "settings.passwordTooShort": "Le mot de passe doit contenir au moins 6 caractères.",
    "settings.passwordChangeError": "Échec de la mise à jour du mot de passe. Veuillez réessayer.",
    "settings.offlineUnavailable": "Non disponible hors ligne",
    "settings.appearance": "Apparence",
    "settings.language": "Langue",
    "settings.installApp": "Installer l'App",
    "settings.installDescription": "Installez Tekyida sur votre appareil pour un accès rapide.",
    "settings.install": "Installer",
    "settings.installed": "Application Installée",
    "settings.installHint": "Utilisez l'option \"Ajouter à l'écran d'accueil\" de votre navigateur.",
    "settings.amountsOnLoad": "Montants au chargement",
    "settings.alwaysHidden": "Masqués",
    "settings.rememberLast": "Dernier état",
    "settings.signOut": "Déconnexion",
    "settings.signOutConfirm": "Êtes-vous sûr de vouloir vous déconnecter ?",

    // Sync
    "sync.offline": "Hors-ligne",
    "sync.pending": "{count} en attente",
    "sync.syncing": "Synchronisation…",
    "sync.synced": "Synchronisé",
};

export default fr;
