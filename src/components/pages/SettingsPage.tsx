/* global chrome */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import {
  Check,
  Menu,
  X,
  Layers,
  Search as SearchIcon,
  Bookmark,
  Gamepad2,
  Shield,
  TrendingUp,
  ScanLine,
  Barcode,
  Link2,
  Trash2,
  RefreshCw,
  Download,
  MousePointerClick,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Switch } from "../ui/switch";
import { Toggle } from "../ui/toggle";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import {
  DEFAULT_ENABLED_TOOLS,
  TOOLBAR_TOOLS,
  type ToolbarTool,
} from "../../lib/tools";

type CmdkSources = {
  tabs: boolean;
  bookmarks: boolean;
  history: boolean;
  quickLinks: boolean;
  tools: boolean;
  searchProviders: boolean;
  ebayCategories: boolean;
};

interface CmdkSettings {
  enabledSources: CmdkSources;
  sourceOrder: string[];
  enabledSearchProviders: {
    [providerId: string]: boolean;
  };
  customSearchProviders: Array<{
    id: string;
    name: string;
    triggers: string[];
    searchUrl: string;
    color: string;
  }>;
  shopifyGuardrails?: {
    enableConditionCheck: boolean;
    enableGoogleFieldsCheck: boolean;
  };
  controllerTesting?: {
    lightThreshold: number;
    mediumThreshold: number;
    autoOpen?: boolean;
  };
  bookmarkFolderIds?: string[];
  ebaySummary?: {
    enabled: boolean;
  };
  upcHighlighter: {
    enabled: boolean;
  };
  csvLinks?: {
    customUrl?: string;
  };
  contextMenu?: {
    enabled: boolean;
  };
}

const HOSTED_URL = "https://paymore-extension.vercel.app";
const LOCAL_URL = "http://localhost:3000";

const BASE_CMDK_SETTINGS: CmdkSettings = {
  enabledSources: {
    tabs: true,
    bookmarks: true,
    history: true,
    quickLinks: true,
    tools: true,
    searchProviders: true,
    ebayCategories: true,
  },
  sourceOrder: [
    "quickLinks",
    "ebayCategories",
    "tools",
    "tabs",
    "bookmarks",
    "searchProviders",
    "history",
  ],
  enabledSearchProviders: {
    google: true,
    amazon: true,
    bestbuy: true,
    ebay: true,
    pricecharting: true,
    upcitemdb: true,
    youtube: true,
    github: true,
    twitter: true,
    homedepot: true,
    lowes: true,
    menards: true,
    microcenter: true,
  },
  customSearchProviders: [],
  shopifyGuardrails: {
    enableConditionCheck: true,
    enableGoogleFieldsCheck: true,
  },
  controllerTesting: {
    lightThreshold: 0.1,
    mediumThreshold: 0.25,
    autoOpen: true,
  },
  bookmarkFolderIds: [],
  ebaySummary: {
    enabled: true,
  },
  upcHighlighter: {
    enabled: true,
  },
  csvLinks: {
    customUrl: "",
  },
  contextMenu: {
    enabled: true,
  },
};

const SOURCE_KEYS = Object.keys(BASE_CMDK_SETTINGS.enabledSources) as Array<
  keyof CmdkSources
>;

const createDefaultCmdkSettings = (): CmdkSettings => ({
  enabledSources: { ...BASE_CMDK_SETTINGS.enabledSources },
  sourceOrder: [...BASE_CMDK_SETTINGS.sourceOrder],
  enabledSearchProviders: { ...BASE_CMDK_SETTINGS.enabledSearchProviders },
  customSearchProviders: [...BASE_CMDK_SETTINGS.customSearchProviders],
  shopifyGuardrails: {
    enableConditionCheck:
      BASE_CMDK_SETTINGS.shopifyGuardrails?.enableConditionCheck ?? true,
    enableGoogleFieldsCheck:
      BASE_CMDK_SETTINGS.shopifyGuardrails?.enableGoogleFieldsCheck ?? true,
  },
  controllerTesting: {
    lightThreshold: BASE_CMDK_SETTINGS.controllerTesting?.lightThreshold ?? 0.1,
    mediumThreshold:
      BASE_CMDK_SETTINGS.controllerTesting?.mediumThreshold ?? 0.25,
    autoOpen: BASE_CMDK_SETTINGS.controllerTesting?.autoOpen ?? true,
  },
  bookmarkFolderIds: BASE_CMDK_SETTINGS.bookmarkFolderIds
    ? [...BASE_CMDK_SETTINGS.bookmarkFolderIds]
    : [],
  ebaySummary: {
    enabled: BASE_CMDK_SETTINGS.ebaySummary?.enabled ?? true,
  },
  upcHighlighter: {
    enabled: BASE_CMDK_SETTINGS.upcHighlighter?.enabled ?? true,
  },
  csvLinks: {
    customUrl: BASE_CMDK_SETTINGS.csvLinks?.customUrl ?? "",
  },
  contextMenu: {
    enabled: BASE_CMDK_SETTINGS.contextMenu?.enabled ?? true,
  },
});

const mergeCmdkSettings = (stored?: Partial<CmdkSettings>): CmdkSettings => {
  const defaults = createDefaultCmdkSettings();
  if (!stored) return defaults;

  const enabledSources = {
    ...defaults.enabledSources,
    ...(stored.enabledSources || {}),
  };

  const sanitizedOrder = Array.isArray(stored.sourceOrder)
    ? stored.sourceOrder.filter((key) =>
        SOURCE_KEYS.includes(key as keyof CmdkSources)
      )
    : [];
  const mergedOrder = [...sanitizedOrder];
  SOURCE_KEYS.forEach((key) => {
    if (!mergedOrder.includes(key)) {
      mergedOrder.push(key);
    }
  });

  const mergedEnabledProviders = {
    ...defaults.enabledSearchProviders,
    ...(stored.enabledSearchProviders || {}),
  };

  const mergedShopifyGuardrails = {
    enableConditionCheck:
      stored.shopifyGuardrails?.enableConditionCheck ??
      defaults.shopifyGuardrails?.enableConditionCheck ??
      true,
    enableGoogleFieldsCheck:
      stored.shopifyGuardrails?.enableGoogleFieldsCheck ??
      defaults.shopifyGuardrails?.enableGoogleFieldsCheck ??
      true,
  };

  const mergedControllerTesting = {
    lightThreshold:
      stored.controllerTesting?.lightThreshold ??
      defaults.controllerTesting?.lightThreshold ??
      0.1,
    mediumThreshold:
      stored.controllerTesting?.mediumThreshold ??
      defaults.controllerTesting?.mediumThreshold ??
      0.25,
    autoOpen:
      stored.controllerTesting?.autoOpen ??
      defaults.controllerTesting?.autoOpen ??
      true,
  };

  const mergedEbaySummary = {
    enabled:
      stored.ebaySummary?.enabled ?? defaults.ebaySummary?.enabled ?? true,
  };

  const mergedUpcHighlighter = {
    enabled:
      stored.upcHighlighter?.enabled ??
      defaults.upcHighlighter?.enabled ??
      true,
  };

  const mergedCsvLinks = {
    customUrl: stored.csvLinks?.customUrl ?? defaults.csvLinks?.customUrl ?? "",
  };

  const mergedContextMenu = {
    enabled:
      stored.contextMenu?.enabled ?? defaults.contextMenu?.enabled ?? true,
  };

  return {
    ...defaults,
    ...stored,
    enabledSources,
    sourceOrder: mergedOrder,
    enabledSearchProviders: mergedEnabledProviders,
    customSearchProviders: stored.customSearchProviders
      ? [...stored.customSearchProviders]
      : [...defaults.customSearchProviders],
    shopifyGuardrails: mergedShopifyGuardrails,
    controllerTesting: mergedControllerTesting,
    bookmarkFolderIds: stored.bookmarkFolderIds
      ? [...stored.bookmarkFolderIds]
      : defaults.bookmarkFolderIds
      ? [...defaults.bookmarkFolderIds]
      : [],
    ebaySummary: mergedEbaySummary,
    upcHighlighter: mergedUpcHighlighter,
    csvLinks: mergedCsvLinks,
    contextMenu: mergedContextMenu,
  };
};

const NAV_ITEMS = [
  { id: "sources", label: "Command Menu", icon: Layers },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "providers", label: "Search Providers", icon: SearchIcon },
  { id: "guardrails", label: "Shopify Guardrails", icon: Shield },
  { id: "controller", label: "Controller Testing", icon: Gamepad2 },
  { id: "ebay", label: "eBay Price Summary", icon: TrendingUp },
  { id: "upc", label: "UPC Highlighter", icon: Barcode },
  { id: "contextmenu", label: "Context Menu", icon: MousePointerClick },
  { id: "csvlinks", label: "Quick Links", icon: Link2 },
  { id: "toolbar", label: "Toolbar", icon: SettingsIcon },
  { id: "deployment", label: "Deployment", icon: Download },
];

const flashFactory = () => {
  const timeouts = new Set<number>();
  const flash = (setter: (value: boolean) => void) => {
    setter(true);
    const timeout = window.setTimeout(() => {
      setter(false);
      timeouts.delete(timeout);
    }, 2000);
    timeouts.add(timeout);
  };

  const clear = () => {
    timeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    timeouts.clear();
  };

  return { flash, clear };
};

const notifyTabs = (action: string, enabled: boolean) => {
  try {
    chrome.tabs.query({}, (tabs: any[]) => {
      tabs.forEach((tab: any) => {
        if (typeof tab.id === "number") {
          try {
            chrome.tabs.sendMessage(
              tab.id,
              { action, enabled },
              () => void chrome.runtime.lastError
            );
          } catch (error) {
            // Ignore tabs that don't accept messages
          }
        }
      });
    });
  } catch (error) {
    // chrome.tabs might be unavailable in certain contexts (tests)
  }
};

const getToolIcon = (tool: ToolbarTool) => {
  const Comp = (tool as any).reactIcon;
  if (Comp) return <Comp className="h-5 w-5" />;
  const rawSvg = (tool as any).svg;
  if (rawSvg) {
    return (
      <span
        className="inline-block h-6 w-6"
        dangerouslySetInnerHTML={{ __html: rawSvg }}
      />
    );
  }
  const img = (tool as any).img;
  if (img) {
    return (
      <img src={img} alt={tool.label} className="h-6 w-6 object-contain" />
    );
  }
  return <span className="text-xs">{tool.label}</span>;
};

export default function SettingsPage() {
  const [cmdkSettings, setCmdkSettings] = useState<CmdkSettings>(
    createDefaultCmdkSettings()
  );
  const [enabledTools, setEnabledTools] = useState<string[]>(
    DEFAULT_ENABLED_TOOLS
  );
  const [toolbarTheme, setToolbarTheme] = useState<string>("stone");
  const [toolbarHue, setToolbarHue] = useState<number>(0);
  const [scannerBaseUrl, setScannerBaseUrl] = useState<string>(HOSTED_URL);
  const [version, setVersion] = useState<string>("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeNav, setActiveNav] = useState<string>(NAV_ITEMS[0].id);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [toolbarSaved, setToolbarSaved] = useState(false);
  const [deploymentSaved, setDeploymentSaved] = useState(false);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "",
    triggers: [] as string[],
    searchUrl: "",
    color: "bg-blue-500",
  });
  const [bookmarkFolders, setBookmarkFolders] = useState<any[]>([]);
  const [csvCacheCleared, setCsvCacheCleared] = useState(false);
  const [csvRefreshing, setCsvRefreshing] = useState(false);
  const [csvDownloading, setCsvDownloading] = useState(false);

  const { flash: flashSaved, clear: clearSavedFlash } = useMemo(
    flashFactory,
    []
  );

  useEffect(() => {
    const initialHash = window.location.hash?.replace("#", "");
    if (initialHash) {
      setActiveNav(initialHash);
      // Scroll to the section after a short delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(initialHash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }

    try {
      chrome.storage.local.get(
        {
          scannerBaseUrl: HOSTED_URL,
          enabledToolbarTools: DEFAULT_ENABLED_TOOLS,
          toolbarTheme: "stone",
        },
        (result: any) => {
          const url =
            result.scannerBaseUrl ||
            (typeof localStorage !== "undefined" &&
              localStorage.getItem("scannerBaseUrl")) ||
            HOSTED_URL;
          const tools =
            result.enabledToolbarTools ||
            JSON.parse(
              (typeof localStorage !== "undefined" &&
                localStorage.getItem("enabledToolbarTools")) ||
                "null"
            ) ||
            DEFAULT_ENABLED_TOOLS;
          const theme =
            result.toolbarTheme ||
            (typeof localStorage !== "undefined" &&
              localStorage.getItem("toolbarTheme")) ||
            "stone";

          setScannerBaseUrl(String(url));
          setEnabledTools(Array.isArray(tools) ? tools : DEFAULT_ENABLED_TOOLS);
          setToolbarTheme(String(theme));
        }
      );
    } catch (error) {
      // Ignore storage failures (e.g., during tests)
    }

    try {
      chrome.storage.sync.get(["cmdkSettings"], (result: any) => {
        if (result?.cmdkSettings) {
          const merged = mergeCmdkSettings(result.cmdkSettings);
          setCmdkSettings(merged);

          // Sync autoOpen setting to chrome.storage.local for content script
          try {
            chrome.storage.local.set({ autoShowModal: merged.controllerTesting?.autoOpen ?? true });
          } catch (error) {
            // Ignore storage failures
          }
        }
      });
    } catch (error) {
      // Ignore sync storage failures
    }

    try {
      const manifest = chrome.runtime.getManifest();
      if (manifest?.version) {
        setVersion(String(manifest.version));
      }
    } catch (error) {
      // Ignore runtime access issues
    }

    // Load bookmark folders
    try {
      chrome.bookmarks.getTree((bookmarkTreeNodes: any[]) => {
        const folders: any[] = [];
        const traverseTree = (nodes: any[]) => {
          nodes.forEach((node: any) => {
            if (node.children) {
              // This is a folder
              folders.push({
                id: node.id,
                title: node.title || "Bookmarks",
              });
              traverseTree(node.children);
            }
          });
        };
        traverseTree(bookmarkTreeNodes);
        setBookmarkFolders(folders);
      });
    } catch (error) {
      // Ignore bookmark access failures
    }

    return () => {
      clearSavedFlash();
    };
  }, [clearSavedFlash]);

  const saveCmdkSettings = useCallback(
    (next: CmdkSettings, notify?: { action: string; enabled: boolean }) => {
      try {
        chrome.storage.sync.set({ cmdkSettings: next }, () => {
          flashSaved(setSettingsSaved);
          if (notify) {
            notifyTabs(notify.action, notify.enabled);
          }
        });
      } catch (error) {
        // Ignore sync storage failures
      }
    },
    [flashSaved]
  );

  const persistSettings = useCallback(
    (nextTools: string[], nextUrl?: string, nextTheme?: string) => {
      try {
        chrome.storage.local.set({
          scannerBaseUrl: nextUrl ?? scannerBaseUrl,
          enabledToolbarTools: nextTools,
          toolbarTheme: nextTheme ?? toolbarTheme,
        });
      } catch (error) {
        // Ignore storage failures
      }
      try {
        if (typeof localStorage !== "undefined") {
          if (nextUrl) localStorage.setItem("scannerBaseUrl", String(nextUrl));
          localStorage.setItem(
            "enabledToolbarTools",
            JSON.stringify(nextTools)
          );
          localStorage.setItem(
            "toolbarTheme",
            String(nextTheme ?? toolbarTheme)
          );
        }
      } catch (error) {
        // Ignore localStorage errors (e.g., privacy mode)
      }
    },
    [scannerBaseUrl, toolbarTheme]
  );

  const toggleTool = (toolId: string) => {
    setEnabledTools((prev) => {
      const next = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      persistSettings(next);
      flashSaved(setToolbarSaved);
      return next;
    });
  };

  const handleThemeChange = (themeId: string) => {
    setToolbarTheme(themeId);
    persistSettings(enabledTools, undefined, themeId);
    flashSaved(setToolbarSaved);
  };

  const handleHueChange = (hue: number) => {
    setToolbarHue(hue);
    // Convert hue to closest named color theme
    const hueThemeMap = [
      { hue: 0, theme: "rose" },
      { hue: 20, theme: "orange" },
      { hue: 45, theme: "amber" },
      { hue: 160, theme: "emerald" },
      { hue: 180, theme: "cyan" },
      { hue: 190, theme: "teal" },
      { hue: 210, theme: "blue" },
      { hue: 220, theme: "indigo" },
      { hue: 260, theme: "violet" },
      { hue: 300, theme: "stone" }, // neutral
    ];

    // Find closest hue
    let closestTheme = hueThemeMap[0];
    let minDiff = Math.abs(hue - hueThemeMap[0].hue);

    hueThemeMap.forEach(({ hue: targetHue, theme }) => {
      const diff = Math.min(
        Math.abs(hue - targetHue),
        Math.abs(hue + 360 - targetHue),
        Math.abs(hue - 360 - targetHue)
      );
      if (diff < minDiff) {
        minDiff = diff;
        closestTheme = { hue: targetHue, theme };
      }
    });

    setToolbarTheme(closestTheme.theme);
    persistSettings(enabledTools, undefined, closestTheme.theme);
    flashSaved(setToolbarSaved);
  };

  const handleToggleSource = (source: keyof CmdkSources) => {
    const next = {
      ...cmdkSettings,
      enabledSources: {
        ...cmdkSettings.enabledSources,
        [source]: !cmdkSettings.enabledSources[source],
      },
    };
    setCmdkSettings(next);
    saveCmdkSettings(next);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...cmdkSettings.sourceOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    const next = {
      ...cmdkSettings,
      sourceOrder: newOrder,
    };

    setCmdkSettings(next);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    saveCmdkSettings(cmdkSettings);
  };

  const handleResetCmdk = () => {
    const defaults = createDefaultCmdkSettings();
    setCmdkSettings(defaults);
    saveCmdkSettings(defaults, {
      action: "upc-highlighter-settings-changed",
      enabled: defaults.upcHighlighter.enabled,
    });

    // Also update chrome.storage.local for the content script
    try {
      chrome.storage.local.set({ autoShowModal: defaults.controllerTesting?.autoOpen ?? true });
    } catch (error) {
      // Ignore storage failures
    }
  };

  const handleResetToolbar = () => {
    const defaults = [...DEFAULT_ENABLED_TOOLS];
    setEnabledTools(defaults);
    setToolbarTheme("stone");
    persistSettings(defaults, undefined, "stone");
    flashSaved(setToolbarSaved);
  };

  const handleResetDeployment = () => {
    setScannerBaseUrl(HOSTED_URL);
    persistSettings(enabledTools, HOSTED_URL);
    flashSaved(setDeploymentSaved);
  };

  const handleScannerUrlChange = (url: string) => {
    setScannerBaseUrl(url);
    persistSettings(enabledTools, url);
    flashSaved(setDeploymentSaved);
  };

  const handleLocalhostToggle = (checked: boolean) => {
    const nextUrl = checked ? LOCAL_URL : HOSTED_URL;
    setScannerBaseUrl(nextUrl);
    persistSettings(enabledTools, nextUrl);
    flashSaved(setDeploymentSaved);
  };

  const handleUpcHighlighterChange = (enabled: boolean) => {
    const next = {
      ...cmdkSettings,
      upcHighlighter: {
        enabled,
      },
    };
    setCmdkSettings(next);
    saveCmdkSettings(next, {
      action: "upc-highlighter-settings-changed",
      enabled,
    });
  };

  const handleToggleSearchProvider = (providerId: string) => {
    const newSettings = {
      ...cmdkSettings,
      enabledSearchProviders: {
        ...cmdkSettings.enabledSearchProviders,
        [providerId]: !cmdkSettings.enabledSearchProviders[providerId],
      },
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);
  };

  const handleAddCustomProvider = () => {
    if (
      !newProvider.name ||
      !newProvider.triggers.length ||
      !newProvider.searchUrl
    ) {
      return;
    }

    const id = newProvider.name.toLowerCase().replace(/\s+/g, "-");
    const customProvider = {
      id,
      name: newProvider.name,
      triggers: newProvider.triggers,
      searchUrl: newProvider.searchUrl,
      color: newProvider.color,
    };

    const newSettings = {
      ...cmdkSettings,
      customSearchProviders: [
        ...cmdkSettings.customSearchProviders,
        customProvider,
      ],
      enabledSearchProviders: {
        ...cmdkSettings.enabledSearchProviders,
        [id]: true,
      },
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);

    // Reset form
    setNewProvider({
      name: "",
      triggers: [],
      searchUrl: "",
      color: "bg-blue-500",
    });
    setShowAddProvider(false);
  };

  const handleDeleteCustomProvider = (index: number) => {
    const providerToDelete = cmdkSettings.customSearchProviders[index];
    const newCustomProviders = [...cmdkSettings.customSearchProviders];
    newCustomProviders.splice(index, 1);

    const newEnabledProviders = { ...cmdkSettings.enabledSearchProviders };
    delete newEnabledProviders[providerToDelete.id];

    const newSettings = {
      ...cmdkSettings,
      customSearchProviders: newCustomProviders,
      enabledSearchProviders: newEnabledProviders,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);
  };

  const handleToggleGuardrail = (type: "condition" | "googleFields") => {
    const newGuardrails = {
      ...cmdkSettings.shopifyGuardrails,
      enableConditionCheck:
        type === "condition"
          ? !cmdkSettings.shopifyGuardrails?.enableConditionCheck
          : cmdkSettings.shopifyGuardrails?.enableConditionCheck ?? true,
      enableGoogleFieldsCheck:
        type === "googleFields"
          ? !cmdkSettings.shopifyGuardrails?.enableGoogleFieldsCheck
          : cmdkSettings.shopifyGuardrails?.enableGoogleFieldsCheck ?? true,
    };

    const newSettings = {
      ...cmdkSettings,
      shopifyGuardrails: newGuardrails,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings, {
      action: "guardrails-settings-changed",
      enabled: true,
    });
  };

  const handleControllerThresholdChange = (
    type: "light" | "medium",
    value: number
  ) => {
    const newThresholds = {
      ...cmdkSettings.controllerTesting,
      lightThreshold:
        type === "light"
          ? value
          : cmdkSettings.controllerTesting?.lightThreshold ?? 0.1,
      mediumThreshold:
        type === "medium"
          ? value
          : cmdkSettings.controllerTesting?.mediumThreshold ?? 0.25,
    };

    const newSettings = {
      ...cmdkSettings,
      controllerTesting: newThresholds,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);
  };

  const handleControllerAutoOpenChange = (enabled: boolean) => {
    const newControllerTesting = {
      ...cmdkSettings.controllerTesting,
      lightThreshold: cmdkSettings.controllerTesting?.lightThreshold ?? 0.1,
      mediumThreshold: cmdkSettings.controllerTesting?.mediumThreshold ?? 0.25,
      autoOpen: enabled,
    };

    const newSettings = {
      ...cmdkSettings,
      controllerTesting: newControllerTesting,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);

    // Also update chrome.storage.local for the content script
    try {
      chrome.storage.local.set({ autoShowModal: enabled });
    } catch (error) {
      // Ignore storage failures
    }
  };

  const handleBookmarkFolderToggle = (folderId: string) => {
    const currentFolders = cmdkSettings.bookmarkFolderIds || [];
    const newFolders = currentFolders.includes(folderId)
      ? currentFolders.filter((id) => id !== folderId)
      : [...currentFolders, folderId];

    const newSettings = {
      ...cmdkSettings,
      bookmarkFolderIds: newFolders,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);
  };

  const handleSelectAllFolders = () => {
    const newSettings = {
      ...cmdkSettings,
      bookmarkFolderIds: [],
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);
  };

  const handleToggleEbaySummary = () => {
    const newEbaySummary = {
      ...cmdkSettings.ebaySummary,
      enabled: !cmdkSettings.ebaySummary?.enabled,
    };

    const newSettings = {
      ...cmdkSettings,
      ebaySummary: newEbaySummary,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings, {
      action: "ebay-summary-settings-changed",
      enabled: newEbaySummary.enabled,
    });
  };

  const handleToggleContextMenu = () => {
    const newContextMenu = {
      ...cmdkSettings.contextMenu,
      enabled: !cmdkSettings.contextMenu?.enabled,
    };

    const newSettings = {
      ...cmdkSettings,
      contextMenu: newContextMenu,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings, {
      action: "context-menu-settings-changed",
      enabled: newContextMenu.enabled,
    });
  };

  const handleCsvUrlChange = (url: string) => {
    const newCsvLinks = {
      ...cmdkSettings.csvLinks,
      customUrl: url,
    };

    const newSettings = {
      ...cmdkSettings,
      csvLinks: newCsvLinks,
    };
    setCmdkSettings(newSettings);
    saveCmdkSettings(newSettings);
  };

  const handleClearCsvCache = () => {
    chrome.storage.local.remove(
      ["csvLinksCache", "csvLinksCacheTimestamp"],
      () => {
        if (chrome.runtime.lastError) {
          console.error("Error clearing cache:", chrome.runtime.lastError);
        } else {
          setCsvCacheCleared(true);
          setTimeout(() => setCsvCacheCleared(false), 3000);
        }
      }
    );
  };

  const handleRefreshCsvLinks = async () => {
    setCsvRefreshing(true);

    chrome.storage.local.remove(
      ["csvLinksCache", "csvLinksCacheTimestamp"],
      async () => {
        if (chrome.runtime.lastError) {
          console.error("Error clearing cache:", chrome.runtime.lastError);
          setCsvRefreshing(false);
          return;
        }

        try {
          // Trigger a refresh by clearing cache
          setCsvCacheCleared(true);
          setTimeout(() => setCsvCacheCleared(false), 3000);
        } catch (error) {
          console.error("Error refreshing CSV links:", error);
        } finally {
          setCsvRefreshing(false);
        }
      }
    );
  };

  const handleDownloadDefaultCsv = async () => {
    setCsvDownloading(true);

    try {
      // Default CSV URL
      const defaultUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8y5eHw3bj0MA0pyMS81o9AbAKrYQL_-a04P_hjoNrkYrrT9VyfsFZk8GE_RM_GRBKJG2J2r3OsZQj/pub?gid=808603945&single=true&output=csv";

      // Fetch the CSV
      const response = await fetch(defaultUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch default CSV");
      }

      const csvContent = await response.text();

      // Create a blob and download it
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "paymore-quicklinks-template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("[Settings] Default CSV downloaded successfully");
    } catch (error) {
      console.error("[Settings] Error downloading default CSV:", error);
      alert("Failed to download CSV. Please try again.");
    } finally {
      setCsvDownloading(false);
    }
  };

  const usingLocalhost = useMemo(
    () =>
      /localhost(:\d+)?$/.test(
        String(scannerBaseUrl).replace(/https?:\/\//, "")
      ),
    [scannerBaseUrl]
  );

  const sortedSources = useMemo(
    () =>
      cmdkSettings.sourceOrder
        .map((key) => ({
          key: key as keyof CmdkSources,
          label:
            {
              tabs: "Tabs",
              bookmarks: "Bookmarks",
              history: "Recent History",
              quickLinks: "Quick Links",
              tools: "Tools",
              searchProviders: "Search Providers",
              ebayCategories: "eBay Categories",
            }[key as keyof CmdkSources] || key,
          description:
            {
              tabs: "Search and switch between open browser tabs",
              bookmarks: "Access your saved bookmarks",
              history: "View recently visited pages",
              quickLinks: "CSV-based custom links organized by category",
              tools: "Paymore extension tools and features",
              searchProviders:
                "Google, YouTube, Amazon, and other search engines",
              ebayCategories: "Live eBay category suggestions as you type",
            }[key as keyof CmdkSources] || "",
        }))
        .filter(Boolean),
    [cmdkSettings.sourceOrder]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      {/* Header Bar */}
      <div className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/brand.png"
              alt="PayMore"
              className="w-8 h-8 rounded-lg shadow-sm"
            />
            <div>
              <h1 className="text-lg font-bold">PayMore Settings</h1>
              {version && (
                <p className="text-xs text-muted-foreground">
                  Version {version}
                </p>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {settingsSaved && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Saved!</span>
              </div>
            )}
            <button
              onClick={handleResetCmdk}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex max-w-[1800px] mx-auto">
        {/* Sidebar Navigation */}
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r border-border/40 bg-background/50 backdrop-blur p-6">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveNav(item.id);
                    const element = document.getElementById(item.id);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    // Update URL hash without triggering page jump
                    window.history.pushState(null, "", `#${item.id}`);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors",
                    activeNav === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  )}
                >
                  <IconComponent className="w-4 h-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/40">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground block mb-2">Quick Tip</strong>
              Drag the <Menu className="w-3 h-3 inline" /> icon to reorder
              sources. Changes are saved automatically.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 space-y-12 max-w-5xl">
          {/* Command Sources Section */}
          <section id="sources" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Command Menu Sources</h2>
              <p className="text-muted-foreground">
                Control which sources appear in your command menu and customize
                their order
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {sortedSources.map((source, index) => (
                  <div
                    key={source.key}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`p-6 flex items-start gap-4 hover:bg-muted/30 transition-all cursor-move group ${
                      draggedIndex === index ? "opacity-50 scale-[0.98]" : ""
                    }`}
                  >
                    <button
                      className="p-2 text-muted-foreground group-hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-base">
                          {source.label}
                        </h3>
                        {cmdkSettings.enabledSources[source.key] && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                            Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {source.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleSource(source.key)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        cmdkSettings.enabledSources[source.key]
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          cmdkSettings.enabledSources[source.key]
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bookmarks Section */}
          <section id="bookmarks" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Bookmarks</h2>
              <p className="text-muted-foreground">
                Choose which bookmark folders to display in the command menu
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium">
                      Bookmark Folders
                    </label>
                    <button
                      onClick={handleSelectAllFolders}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {cmdkSettings.bookmarkFolderIds?.length === 0
                        ? "Selected: All"
                        : "Select All"}
                    </button>
                  </div>

                  {cmdkSettings.bookmarkFolderIds?.length === 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        All bookmarks from all folders are currently shown
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bookmarkFolders.map((folder) => {
                      const isSelected =
                        cmdkSettings.bookmarkFolderIds?.includes(folder.id) ??
                        false;
                      return (
                        <div
                          key={folder.id}
                          onClick={() => handleBookmarkFolderToggle(folder.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary hover:bg-primary/15"
                              : "bg-muted/30 border-border hover:bg-muted/50"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "bg-background border-muted-foreground/30"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-sm font-medium flex-1">
                            {folder.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Select specific folders to show only bookmarks from those
                    folders, or click "Select All" to show bookmarks from all
                    folders
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Search Providers Section */}
          <section id="providers" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Search Providers</h2>
              <p className="text-muted-foreground">
                Configure built-in search engines and create custom search
                providers
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {/* Default Search Providers */}
                <div className="p-8">
                  <h3 className="font-semibold text-lg mb-5">
                    Default Providers
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                      { id: "google", name: "Google" },
                      { id: "amazon", name: "Amazon" },
                      { id: "bestbuy", name: "Best Buy" },
                      { id: "ebay", name: "eBay" },
                      { id: "pricecharting", name: "Price Charting" },
                      { id: "upcitemdb", name: "UPCItemDB" },
                      { id: "youtube", name: "YouTube" },
                      { id: "github", name: "GitHub" },
                      { id: "twitter", name: "Twitter/X" },
                      { id: "homedepot", name: "Home Depot" },
                      { id: "lowes", name: "Lowe's" },
                      { id: "menards", name: "Menards" },
                      { id: "microcenter", name: "Micro Center" },
                    ].map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-medium">
                          {provider.name}
                        </span>
                        <button
                          onClick={() =>
                            handleToggleSearchProvider(provider.id)
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            cmdkSettings.enabledSearchProviders[provider.id] ||
                            cmdkSettings.enabledSearchProviders[provider.id] ===
                              undefined
                              ? "bg-primary"
                              : "bg-muted-foreground/30"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              cmdkSettings.enabledSearchProviders[
                                provider.id
                              ] ||
                              cmdkSettings.enabledSearchProviders[
                                provider.id
                              ] === undefined
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Search Providers */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-lg">Custom Providers</h3>
                    <button
                      onClick={() => setShowAddProvider(!showAddProvider)}
                      className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      Add Provider
                    </button>
                  </div>

                  {cmdkSettings.customSearchProviders.length > 0 ? (
                    <div className="space-y-3">
                      {cmdkSettings.customSearchProviders.map(
                        (provider, index) => (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-sm mb-1">
                                {provider.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Triggers: {provider.triggers.join(", ")}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  handleToggleSearchProvider(provider.id)
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  cmdkSettings.enabledSearchProviders[
                                    provider.id
                                  ] ||
                                  cmdkSettings.enabledSearchProviders[
                                    provider.id
                                  ] === undefined
                                    ? "bg-primary"
                                    : "bg-muted-foreground/30"
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                    cmdkSettings.enabledSearchProviders[
                                      provider.id
                                    ] ||
                                    cmdkSettings.enabledSearchProviders[
                                      provider.id
                                    ] === undefined
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteCustomProvider(index)
                                }
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">
                        No custom providers added yet. Click "Add Provider" to
                        create one.
                      </p>
                    </div>
                  )}

                  {showAddProvider && (
                    <div className="mt-6 p-6 border border-border rounded-xl bg-muted/20">
                      <h4 className="font-semibold text-base mb-4">
                        Add Custom Search Provider
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newProvider.name}
                            onChange={(e) =>
                              setNewProvider({
                                ...newProvider,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            placeholder="e.g., Wikipedia"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Triggers (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={newProvider.triggers.join(", ")}
                            onChange={(e) =>
                              setNewProvider({
                                ...newProvider,
                                triggers: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter((t) => t),
                              })
                            }
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            placeholder="e.g., wiki, w"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Search URL
                          </label>
                          <input
                            type="text"
                            value={newProvider.searchUrl}
                            onChange={(e) =>
                              setNewProvider({
                                ...newProvider,
                                searchUrl: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            placeholder="e.g., https://en.wikipedia.org/wiki/Special:Search?search={query}"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Use {"{query}"} as a placeholder for the search term
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Color
                          </label>
                          <select
                            value={newProvider.color}
                            onChange={(e) =>
                              setNewProvider({
                                ...newProvider,
                                color: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          >
                            <option value="bg-blue-500">Blue</option>
                            <option value="bg-green-500">Green</option>
                            <option value="bg-red-500">Red</option>
                            <option value="bg-yellow-500">Yellow</option>
                            <option value="bg-purple-500">Purple</option>
                            <option value="bg-pink-500">Pink</option>
                            <option value="bg-indigo-500">Indigo</option>
                            <option value="bg-gray-500">Gray</option>
                          </select>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleAddCustomProvider}
                            disabled={
                              !newProvider.name ||
                              !newProvider.triggers.length ||
                              !newProvider.searchUrl
                            }
                            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                          >
                            Add Provider
                          </button>
                          <button
                            onClick={() => {
                              setShowAddProvider(false);
                              setNewProvider({
                                name: "",
                                triggers: [],
                                searchUrl: "",
                                color: "bg-blue-500",
                              });
                            }}
                            className="px-5 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Shopify Guardrails Section */}
          <section id="guardrails" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Shopify Guardrails</h2>
              <p className="text-muted-foreground">
                Automated validation checks for Shopify product pages to prevent
                common errors
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {/* Condition Mismatch Check */}
                <div className="p-6 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base">
                        Condition Mismatch Check
                      </h3>
                      {cmdkSettings.shopifyGuardrails?.enableConditionCheck && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Validates that eBay condition ID matches the Shopify
                      condition. Shows red border and notification when
                      mismatched.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleGuardrail("condition")}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      cmdkSettings.shopifyGuardrails?.enableConditionCheck ??
                      true
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        cmdkSettings.shopifyGuardrails?.enableConditionCheck ??
                        true
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Google Fields Check */}
                <div className="p-6 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base">
                        Empty Google Fields Check
                      </h3>
                      {cmdkSettings.shopifyGuardrails
                        ?.enableGoogleFieldsCheck && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Alerts when required Google Shopping metafields are empty.
                      Shows orange border and notification with dismissible
                      warning.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleGuardrail("googleFields")}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      cmdkSettings.shopifyGuardrails?.enableGoogleFieldsCheck ??
                      true
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        cmdkSettings.shopifyGuardrails
                          ?.enableGoogleFieldsCheck ?? true
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Controller Testing Section */}
          <section id="controller" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Controller Testing</h2>
              <p className="text-muted-foreground">
                Adjust color change thresholds for controller input
                visualization and auto-open behavior
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="space-y-6">
                  {/* Auto-Open Toggle */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-2">
                          Auto-Open Controller Testing
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Automatically open the controller testing panel when a
                          game controller is connected and becomes active. Disable
                          this if you want to manually open the controller testing
                          panel.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleControllerAutoOpenChange(
                            !(cmdkSettings.controllerTesting?.autoOpen ?? true)
                          )
                        }
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          cmdkSettings.controllerTesting?.autoOpen ?? true
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                            cmdkSettings.controllerTesting?.autoOpen ?? true
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground mb-4">
                      Set the thresholds at which controller inputs change
                      color:
                      <span className="block mt-2 text-xs">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>{" "}
                        Green: Below light threshold
                        <span className="inline-block w-3 h-3 bg-orange-500 rounded-full ml-3 mr-1"></span>{" "}
                        Orange: Between light and medium
                        <span className="inline-block w-3 h-3 bg-red-500 rounded-full ml-3 mr-1"></span>{" "}
                        Red: Above medium threshold
                      </span>
                    </p>
                  </div>

                  {/* Light Threshold */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-base">
                          Light Input Threshold
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Green → Orange transition point
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-medium px-3 py-1 bg-muted rounded-lg">
                          {(
                            cmdkSettings.controllerTesting?.lightThreshold ??
                            0.1
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={
                          cmdkSettings.controllerTesting?.lightThreshold ?? 0.1
                        }
                        onChange={(e) =>
                          handleControllerThresholdChange(
                            "light",
                            parseFloat(e.target.value)
                          )
                        }
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Medium Threshold */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-base">
                          Medium Input Threshold
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Orange → Red transition point
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-medium px-3 py-1 bg-muted rounded-lg">
                          {(
                            cmdkSettings.controllerTesting?.mediumThreshold ??
                            0.25
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={
                          cmdkSettings.controllerTesting?.mediumThreshold ??
                          0.25
                        }
                        onChange={(e) =>
                          handleControllerThresholdChange(
                            "medium",
                            parseFloat(e.target.value)
                          )
                        }
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* eBay Price Summary Section */}
          <section id="ebay" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">eBay Price Summary</h2>
              <p className="text-muted-foreground">
                Configure the price summary feature for eBay sold listings
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {/* Enable/Disable Toggle */}
                <div className="p-6 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base">
                        Enable Price Summary
                      </h3>
                      {cmdkSettings.ebaySummary?.enabled && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Automatically displays average, median, high, and low sale
                      prices for eBay sold listings. Includes clickable metrics
                      to jump to specific listings and quick filters for viewing
                      new/used items.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        • Shows price statistics at the top of search results
                      </p>
                      <p>
                        • Click metrics to scroll to highest/lowest/latest sold
                        items
                      </p>
                      <p>• Quick filter buttons for new and used conditions</p>
                      <p>• Dismissible per search session</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleEbaySummary}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      cmdkSettings.ebaySummary?.enabled ?? true
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        cmdkSettings.ebaySummary?.enabled ?? true
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* UPC Highlighter Section */}
          <section id="upc" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">UPC Highlighter</h2>
              <p className="text-muted-foreground">
                Automatically detect and highlight UPC codes on web pages
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {/* Enable/Disable Toggle */}
                <div className="p-6 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base">
                        Enable UPC Detection
                      </h3>
                      {cmdkSettings.upcHighlighter?.enabled && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Automatically detects 12-digit UPC codes on web pages,
                      highlights them with a special style, and makes them
                      clickable to copy to clipboard.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Automatically highlights 12-digit UPC codes</p>
                      <p>• Click any highlighted code to copy to clipboard</p>
                      <p>• Hover to see copy tooltip</p>
                      <p>• Works on all websites including dynamic content</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleUpcHighlighterChange(
                        !cmdkSettings.upcHighlighter.enabled
                      )
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      cmdkSettings.upcHighlighter?.enabled ?? true
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        cmdkSettings.upcHighlighter?.enabled ?? true
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Context Menu Section */}
          <section id="contextmenu" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Context Menu</h2>
              <p className="text-muted-foreground">
                Configure the right-click context menu behavior
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {/* Enable/Disable Toggle */}
                <div className="p-6 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base">
                        Enable Context Menu
                      </h3>
                      {cmdkSettings.contextMenu?.enabled && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Shows a custom right-click menu with quick actions and
                      search tools. The menu includes a dismiss button to
                      temporarily disable it until page refresh.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        • Quick actions: Copy, Paste, Open in New Tab, Save As
                      </p>
                      <p>
                        • Search tools: Google UPC/MPN, eBay Sold, UPCItemDB,
                        PriceCharting
                      </p>
                      <p>• Controller testing tool access</p>
                      <p>• Alt+Right-click to show native menu instead</p>
                      <p>
                        • Click dismiss button to disable until page refresh
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleContextMenu}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      cmdkSettings.contextMenu?.enabled ?? true
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        cmdkSettings.contextMenu?.enabled ?? true
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* CSV Quick Links Section */}
          <section id="csvlinks" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Quick Links</h2>
              <p className="text-muted-foreground">
                Configure custom CSV URL for Quick Links and manage cache
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="divide-y divide-border">
                {/* Custom CSV URL */}
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-base">
                        Custom CSV URL
                      </h3>
                      <button
                        onClick={handleDownloadDefaultCsv}
                        disabled={csvDownloading}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        <Download
                          className={`w-3.5 h-3.5 ${
                            csvDownloading ? "animate-pulse" : ""
                          }`}
                        />
                        {csvDownloading
                          ? "Downloading..."
                          : "Download Template"}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter a custom Google Sheets CSV URL to load your own
                      Quick Links. Leave empty to use the default URL.
                    </p>
                    <input
                      type="text"
                      value={cmdkSettings.csvLinks?.customUrl || ""}
                      onChange={(e) => handleCsvUrlChange(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/..."
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm font-mono"
                    />
                    <div className="flex items-start gap-2 mt-2">
                      <p className="text-xs text-muted-foreground flex-1">
                        💡 Tip: Download the template to see the required format
                        (Category, Name, URL, Description). Upload to your own
                        Google Sheet, then use "File → Share → Publish to web"
                        and select CSV format.
                      </p>
                    </div>
                  </div>

                  {cmdkSettings.csvLinks?.customUrl && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        ✓ Using custom CSV URL. Clear the cache to reload from
                        your new URL.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cache Management */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-2">
                        Cache Management
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Quick Links are cached for 30 minutes to improve
                        performance. Use these options to manage your CSV cache.
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          • <strong>Refresh Now:</strong> Clears cache and
                          immediately fetches latest links
                        </p>
                        <p>
                          • <strong>Clear Cache:</strong> Only clears cache
                          (fetches on next open)
                        </p>
                        <p>
                          • Use after updating your Google Sheet or changing CSV
                          URL
                        </p>
                      </div>
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          <strong>Note:</strong> Clearing CSV cache does NOT
                          affect your Chrome bookmarks. These are separate
                          features.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleRefreshCsvLinks}
                        disabled={csvRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            csvRefreshing ? "animate-spin" : ""
                          }`}
                        />
                        {csvRefreshing ? "Refreshing..." : "Refresh Now"}
                      </button>
                      <button
                        onClick={handleClearCsvCache}
                        className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Cache
                      </button>
                      {csvCacheCleared && (
                        <div className="flex items-center gap-2 px-3 py-1.5 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Check className="w-4 h-4" />
                          <span className="text-xs font-medium">Done!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Toolbar Section */}
          <section id="toolbar" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Toolbar</h2>
              <p className="text-muted-foreground">
                Customize the floating toolbar appearance and available tools
              </p>
            </div>

            <div className="space-y-6">
              {/* Toolbar Theme Card */}
              <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                <div className="p-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Toolbar Theme</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Select a color theme for the floating toolbar that appears on every page
                      </p>
                    </div>

                    {/* Hue Slider Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Color</label>
                        <div className="flex items-center gap-3">
                          {/* Color Preview Circle */}
                          <div
                            className={cn(
                              "h-10 w-10 rounded-full border-2 border-white shadow-lg transition-all",
                              {
                                "bg-stone-700": toolbarTheme === "stone",
                                "bg-zinc-700": toolbarTheme === "zinc",
                                "bg-slate-700": toolbarTheme === "slate",
                                "bg-blue-600": toolbarTheme === "blue",
                                "bg-emerald-600": toolbarTheme === "emerald",
                                "bg-rose-600": toolbarTheme === "rose",
                                "bg-violet-600": toolbarTheme === "violet",
                                "bg-orange-600": toolbarTheme === "orange",
                                "bg-indigo-600": toolbarTheme === "indigo",
                                "bg-teal-600": toolbarTheme === "teal",
                                "bg-cyan-600": toolbarTheme === "cyan",
                                "bg-amber-600": toolbarTheme === "amber",
                              }
                            )}
                          />
                          <span className="text-sm font-medium capitalize min-w-[80px]">
                            {toolbarTheme}
                          </span>
                        </div>
                      </div>

                      {/* Hue Slider */}
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={toolbarHue}
                          onChange={(e) => handleHueChange(parseInt(e.target.value))}
                          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: "linear-gradient(to right, hsl(0, 80%, 60%), hsl(30, 80%, 60%), hsl(60, 80%, 60%), hsl(120, 80%, 60%), hsl(180, 80%, 60%), hsl(240, 80%, 60%), hsl(300, 80%, 60%), hsl(360, 80%, 60%))",
                          }}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Drag the slider to choose a color theme. Changes apply instantly to all pages.
                      </p>
                    </div>

                    {/* Quick Presets */}
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Quick Presets</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "stone", label: "Stone", hue: 300 },
                          { id: "blue", label: "Blue", hue: 210 },
                          { id: "emerald", label: "Emerald", hue: 160 },
                          { id: "rose", label: "Rose", hue: 0 },
                          { id: "violet", label: "Violet", hue: 260 },
                          { id: "amber", label: "Amber", hue: 45 },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setToolbarHue(preset.hue);
                              handleThemeChange(preset.id);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                              toolbarTheme === preset.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar Tools Card */}
              <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                <div className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Available Tools</h3>
                        <p className="text-sm text-muted-foreground">
                          Select which quick-action tools appear in the floating toolbar
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {enabledTools.length} of {TOOLBAR_TOOLS.length} enabled
                        </p>
                      </div>
                    </div>

                    {/* Tool Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {TOOLBAR_TOOLS.map((tool) => {
                        const active = enabledTools.includes(tool.id);

                        return (
                          <button
                            key={tool.id}
                            onClick={() => toggleTool(tool.id)}
                            className={cn(
                              "relative p-4 rounded-lg border-2 transition-all text-left group hover:shadow-md",
                              active
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border/60 hover:border-border bg-background"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getToolIcon(tool)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">
                                    {tool.label}
                                  </span>
                                  {active && (
                                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                                {tool.description && (
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {tool.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <button
                        onClick={handleResetToolbar}
                        className="px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                      >
                        Reset to Defaults
                      </button>
                      {toolbarSaved && (
                        <div className="flex items-center gap-2 px-3 py-1.5 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">Saved!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Deployment Section */}
          <section id="deployment" className="scroll-mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Deployment</h2>
              <p className="text-muted-foreground">
                Point hosted tools at production or a local development server
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label
                      htmlFor="deployment-url"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Deployment URL
                    </label>
                    <Input
                      id="deployment-url"
                      type="url"
                      value={scannerBaseUrl}
                      onChange={(event) =>
                        handleScannerUrlChange(event.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Used by the popup tools and toolbar links.
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Use localhost</p>
                      <p className="text-xs text-muted-foreground">
                        Quick toggle for {LOCAL_URL}
                      </p>
                    </div>
                    <Switch
                      checked={usingLocalhost}
                      onCheckedChange={handleLocalhostToggle}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDeployment}
                  >
                    Reset deployment URL
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
