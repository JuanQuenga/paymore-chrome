import {
  Search,
  ShoppingCart,
  Youtube,
  Github,
  MessageCircle,
  Tag,
  Barcode,
  DollarSign,
  Store,
} from "lucide-react";

export interface SearchProvider {
  id: string;
  name: string;
  trigger: string[];
  searchUrl: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const searchProviders: SearchProvider[] = [
  {
    id: "google",
    name: "Google",
    trigger: ["google", "g"],
    searchUrl: "https://www.google.com/search?q={query}",
    icon: Search,
    color: "bg-green-500",
  },
  {
    id: "paymore",
    name: "PayMore",
    trigger: ["paymore", "pm", "pay"],
    searchUrl: "https://paymore.com/shop/search/?q={query}",
    icon: Store,
    color: "bg-green-700",
  },
  {
    id: "amazon",
    name: "Amazon",
    trigger: ["amazon", "ama", "amz"],
    searchUrl: "https://www.amazon.com/s?k={query}",
    icon: ShoppingCart,
    color: "bg-orange-500",
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    trigger: ["bestbuy", "bb", "best"],
    searchUrl: "https://www.bestbuy.com/site/searchpage.jsp?st={query}",
    icon: ShoppingCart,
    color: "bg-yellow-500",
  },
  {
    id: "ebay",
    name: "eBay",
    trigger: ["ebay", "eb"],
    searchUrl:
      "https://www.ebay.com/sch/i.html?_nkw={query}&_sacat=0&_from=R40&_dmd=2&rt=nc&LH_Sold=1&LH_Complete=1",
    icon: Tag,
    color: "bg-green-800",
  },
  {
    id: "pricecharting",
    name: "Price Charting",
    trigger: ["pricecharting", "pc", "price"],
    searchUrl:
      "https://www.pricecharting.com/search-products?q={query}&type=prices",
    icon: DollarSign,
    color: "bg-blue-600",
  },
  {
    id: "upcitemdb",
    name: "UPCItemDB",
    trigger: ["upc", "upcitemdb", "barcode"],
    searchUrl: "https://www.upcitemdb.com/upc/{query}",
    icon: Barcode,
    color: "bg-gray-600",
  },
  {
    id: "youtube",
    name: "YouTube",
    trigger: ["youtube", "yt"],
    searchUrl: "https://www.youtube.com/results?search_query={query}",
    icon: Youtube,
    color: "bg-red-500",
  },
  {
    id: "github",
    name: "GitHub",
    trigger: ["github", "gh"],
    searchUrl: "https://github.com/search?q={query}",
    icon: Github,
    color: "bg-stone-800",
  },
  {
    id: "twitter",
    name: "Twitter/X",
    trigger: ["twitter", "x"],
    searchUrl: "https://twitter.com/search?q={query}",
    icon: MessageCircle,
    color: "bg-sky-500",
  },
];

export function findProviderByTrigger(input: string): SearchProvider | null {
  const lowerInput = input.toLowerCase().trim();

  for (const provider of searchProviders) {
    for (const trigger of provider.trigger) {
      if (trigger.startsWith(lowerInput) || lowerInput.startsWith(trigger)) {
        return provider;
      }
    }
  }

  return null;
}
