import type { Locale } from "@/lib/i18n/config";

/**
 * UI message catalog. Covers navigation and marketing chrome only.
 *
 * Legal and policy text (Buyer Protection, terms) is intentionally NOT machine
 * translated — per policy it must be professionally reviewed — so those pages
 * remain in English until a reviewed translation is provided.
 */
export type Messages = {
  nav: {
    market: string;
    earn: string;
    buyerProtection: string;
    signIn: string;
    signUp: string;
    dashboard: string;
    browseCategories: string;
    searchPlaceholder: string;
    balance: string;
    addFunds: string;
  };
  hero: {
    welcome: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    browseMarket: string;
    topUp: string;
    unitsInStock: string;
    categories: string;
    productsListed: string;
  };
  trust: {
    secureTitle: string;
    secureDetail: string;
    verifiedTitle: string;
    verifiedDetail: string;
    fastTitle: string;
    fastDetail: string;
    balanceTitle: string;
    balanceDetail: string;
  };
  sections: {
    exploreCategories: string;
    choosePlatform: string;
    viewAllCategories: string;
    featured: string;
    featuredTitle: string;
    viewFullMarket: string;
    liveInventory: string;
    viewAll: string;
    outOfStock: string;
    available: string;
  };
  footer: {
    tagline: string;
    disclaimer: string;
  };
};

const en: Messages = {
  nav: {
    market: "Market",
    earn: "Earn with Velour",
    buyerProtection: "Buyer protection",
    signIn: "Sign in",
    signUp: "Sign up",
    dashboard: "Dashboard",
    browseCategories: "Browse categories",
    searchPlaceholder: "Search products",
    balance: "Balance",
    addFunds: "Add funds to wallet",
  },
  hero: {
    welcome: "Welcome to Velour",
    titleLine1: "Premium digital goods.",
    titleLine2: "Instant access.",
    subtitle:
      "Browse clear, verified listings for lawful gift codes, wallet codes, vouchers, and official keys — with visible stock, wallet-only checkout, and a structured delivery flow.",
    browseMarket: "Browse market",
    topUp: "Top up wallet",
    unitsInStock: "units in stock",
    categories: "market categories",
    productsListed: "products listed",
  },
  trust: {
    secureTitle: "Trusted checkout",
    secureDetail: "Review the exact scope of every listing before paying.",
    verifiedTitle: "Documented inventory",
    verifiedDetail: "Listings state exactly what you receive — nothing implied.",
    fastTitle: "Fast authorized delivery",
    fastDetail: "Stocked codes move to your orders right after checkout.",
    balanceTitle: "Balance-only purchases",
    balanceDetail: "Products are paid from your Velour wallet, never a card directly.",
  },
  sections: {
    exploreCategories: "Explore categories",
    choosePlatform: "Choose a platform",
    viewAllCategories: "View all categories",
    featured: "Featured",
    featuredTitle: "Featured inventory",
    viewFullMarket: "View full market",
    liveInventory: "Live inventory",
    viewAll: "View all",
    outOfStock: "Out of stock",
    available: "available",
  },
  footer: {
    tagline: "Premium digital goods with documented, lawful inventory.",
    disclaimer:
      "Demo catalog preview — policy pages are informational and not legal advice.",
  },
};

const bg: Messages = {
  nav: {
    market: "Магазин",
    earn: "Печели с Velour",
    buyerProtection: "Защита на купувача",
    signIn: "Вход",
    signUp: "Регистрация",
    dashboard: "Табло",
    browseCategories: "Разгледай категориите",
    searchPlaceholder: "Търси продукти",
    balance: "Баланс",
    addFunds: "Добави средства в портфейла",
  },
  hero: {
    welcome: "Добре дошли във Velour",
    titleLine1: "Премиум дигитални стоки.",
    titleLine2: "Незабавен достъп.",
    subtitle:
      "Разглеждайте ясни, проверени обяви за законни подаръчни кодове, кодове за портфейл, ваучери и официални ключове — с видима наличност, плащане само чрез портфейл и структуриран процес на доставка.",
    browseMarket: "Към магазина",
    topUp: "Зареди портфейла",
    unitsInStock: "налични бройки",
    categories: "категории",
    productsListed: "обявени продукти",
  },
  trust: {
    secureTitle: "Сигурно плащане",
    secureDetail: "Прегледайте точния обхват на всяка обява преди плащане.",
    verifiedTitle: "Документирана наличност",
    verifiedDetail: "Обявите посочват точно какво получавате — без предположения.",
    fastTitle: "Бърза оторизирана доставка",
    fastDetail: "Наличните кодове отиват в поръчките ви веднага след плащане.",
    balanceTitle: "Плащане само с баланс",
    balanceDetail:
      "Продуктите се плащат от портфейла ви във Velour, никога директно с карта.",
  },
  sections: {
    exploreCategories: "Разгледай категориите",
    choosePlatform: "Изберете платформа",
    viewAllCategories: "Всички категории",
    featured: "Избрани",
    featuredTitle: "Избрана наличност",
    viewFullMarket: "Целия магазин",
    liveInventory: "Наличност на живо",
    viewAll: "Виж всички",
    outOfStock: "Изчерпан",
    available: "налични",
  },
  footer: {
    tagline: "Премиум дигитални стоки с документирана, законна наличност.",
    disclaimer:
      "Демо преглед на каталога — страниците с правила са информативни, не са правен съвет.",
  },
};

const DICTIONARIES: Record<Locale, Messages> = { en, bg };

export function getDictionary(locale: Locale): Messages {
  return DICTIONARIES[locale];
}
