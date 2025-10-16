import {
  HelpCircle,
  Calculator,
  CreditCard,
  Clipboard,
  Sliders,
  QrCode,
  Barcode,
  Link as LinkIcon,
  Globe,
  Receipt,
  Layers,
  Scan,
  Gamepad2,
  TabletSmartphone,
  Settings,
} from "lucide-react";

export const TOOLBAR_TOOLS = [
  {
    id: "help",
    label: "Help Center",
    description: "Access tutorials and support",
    buttonId: "pm-tb-help",
    reactIcon: HelpCircle,
  },
  {
    id: "top-offers",
    label: "Top Offers",
    description: "Browse top offers and calculate pricing",
    buttonId: "pm-tb-top-offers",
    reactIcon: Receipt,
  },
  {
    id: "checkout-prices",
    label: "Checkout Prices",
    description: "View store pricing data",
    buttonId: "pm-tb-pricing",
    reactIcon: CreditCard,
  },
  {
    id: "min-reqs",
    label: "Minimum Requirements",
    description: "Check item requirements",
    buttonId: "pm-tb-minreqs",
    reactIcon: TabletSmartphone,
  },
  {
    id: "controller-testing",
    label: "Controller Testing",
    description: "Test hardware controllers",
    buttonId: "pm-tb-controller",
    reactIcon: Gamepad2,
  },
  {
    id: "qr-session",
    label: "Mobile Scanner",
    description: "QR code scanning session",
    buttonId: "pm-tb-qr",
    reactIcon: Scan,
  },
  {
    id: "upc-search",
    label: "UPC Search",
    description: "Search products by UPC",
    buttonId: "pm-tb-upc",
    reactIcon: Barcode,
  },
  {
    id: "links",
    label: "Quick Links",
    description: "Access useful resources",
    buttonId: "pm-tb-links",
    reactIcon: LinkIcon,
  },
  {
    id: "ebay",
    label: "eBay Categories",
    description: "Browse eBay categories",
    buttonId: "pm-tb-ebay",
    reactIcon: Layers,
  },
  {
    id: "price-charting",
    label: "Price Charting",
    description: "View market price trends",
    buttonId: "pm-tb-pricecharting",
    img: "/assets/images/price-charting.webp",
  },
  {
    id: "shopify-storefront",
    label: "Shopify Storefront",
    description: "Search Shopify inventory",
    buttonId: "pm-tb-search",
    img: "/assets/images/shopify-icon.png",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Configure extension settings",
    buttonId: "pm-tb-settings",
    reactIcon: Settings,
  },
] as const;

export type ToolbarToolId = (typeof TOOLBAR_TOOLS)[number]["id"];

export type ToolbarTool = {
  id: string;
  label: string;
  description?: string;
  buttonId: string;
  reactIcon?: any; // React component for popup
  svg?: string; // raw svg markup for toolbar html use
  img?: string; // fallback image path for non-lucide icons
};

export const DEFAULT_ENABLED_TOOLS: ToolbarToolId[] = TOOLBAR_TOOLS.map(
  (tool) => tool.id
);

export function getButtonId(toolId: ToolbarToolId): string {
  const idMap: Record<ToolbarToolId, string> = TOOLBAR_TOOLS.reduce(
    (acc, t) => {
      // @ts-ignore
      acc[t.id] = t.buttonId;
      return acc;
    },
    {} as Record<string, string>
  );
  return idMap[toolId];
}
