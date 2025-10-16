import { useState, useEffect } from "react";
import type { DragEvent } from "react";
import { Button } from "../../src/components/ui/button";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import { Toggle } from "../../src/components/ui/toggle";
import { Switch } from "../../src/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../src/components/ui/accordion";
import { Menu } from "lucide-react";
import { TOOLBAR_TOOLS } from "../../src/lib/tools";
/* global chrome */
declare const chrome: any;

interface CMDKSettings {
  enabledSources: {
    tabs: boolean;
    bookmarks: boolean;
    history: boolean;
    quickLinks: boolean;
    tools: boolean;
    searchProviders: boolean;
    ebayCategories: boolean;
  };
  sourceOrder: string[];
  upcHighlighter: {
    enabled: boolean;
  };
}

const BASE_CMDK_SETTINGS: CMDKSettings = {
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
  upcHighlighter: {
    enabled: true,
  },
};

const SOURCE_KEYS = Object.keys(
  BASE_CMDK_SETTINGS.enabledSources
) as Array<keyof CMDKSettings["enabledSources"]>;

const createDefaultCmdkSettings = (): CMDKSettings => ({
  enabledSources: { ...BASE_CMDK_SETTINGS.enabledSources },
  sourceOrder: [...BASE_CMDK_SETTINGS.sourceOrder],
  upcHighlighter: { ...BASE_CMDK_SETTINGS.upcHighlighter },
});

const mergeCmdkSettings = (stored?: Partial<CMDKSettings>): CMDKSettings => {
  const defaults = createDefaultCmdkSettings();
  if (!stored) return defaults;

  const enabledSources = {
    ...defaults.enabledSources,
    ...(stored.enabledSources || {}),
  };

  const sanitizedOrder = Array.isArray(stored.sourceOrder)
    ? stored.sourceOrder.filter((key) =>
        SOURCE_KEYS.includes(key as keyof CMDKSettings["enabledSources"])
      )
    : [];
  const mergedOrder = [...sanitizedOrder];
  SOURCE_KEYS.forEach((key) => {
    if (!mergedOrder.includes(key)) {
      mergedOrder.push(key);
    }
  });

  return {
    ...defaults,
    ...stored,
    enabledSources,
    sourceOrder: mergedOrder,
    upcHighlighter: {
      ...defaults.upcHighlighter,
      ...(stored.upcHighlighter || {}),
    },
  };
};

const notifyUpcHighlighterChange = (enabled: boolean) => {
  try {
    chrome.tabs.query({}, (tabs: any[]) => {
      tabs.forEach((tab) => {
        if (typeof tab.id === "number") {
          try {
            chrome.tabs.sendMessage(
              tab.id,
              { action: "upc-highlighter-settings-changed", enabled },
              () => void chrome.runtime.lastError
            );
          } catch (error) {
            // Ignore tabs without listeners
          }
        }
      });
    });
  } catch (error) {
    // Ignore query failures
  }
};

export function Settings() {
  const HOSTED_URL = "https://paymore-extension.vercel.app";
  const LOCAL_URL = "http://localhost:3000";

  const [scannerBaseUrl, setScannerBaseUrl] = useState(HOSTED_URL);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [toolbarTheme, setToolbarTheme] = useState<string>("stone");
  const [cmdkSettings, setCmdkSettings] = useState<CMDKSettings>(
    createDefaultCmdkSettings()
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load settings from chrome.storage or fallback to localStorage
    chrome.storage.local.get(
      {
        scannerBaseUrl: HOSTED_URL,
        enabledToolbarTools: TOOLBAR_TOOLS.map((t) => t.id),
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
          TOOLBAR_TOOLS.map((t) => t.id);
        const theme =
          result.toolbarTheme ||
          (typeof localStorage !== "undefined" &&
            localStorage.getItem("toolbarTheme")) ||
          "stone";

        setScannerBaseUrl(url);
        setEnabledTools(
          Array.isArray(tools) ? tools : TOOLBAR_TOOLS.map((t) => t.id)
        );
        setToolbarTheme(String(theme));
      }
    );

    // Load CMDK settings from chrome.storage.sync
    chrome.storage.sync.get(["cmdkSettings"], (result: any) => {
      if (result.cmdkSettings) {
        setCmdkSettings(mergeCmdkSettings(result.cmdkSettings));
      }
    });
  }, []);

  const persistSettings = (
    nextTools: string[],
    nextUrl?: string,
    nextTheme?: string
  ) => {
    try {
      chrome.storage.local.set({
        scannerBaseUrl: nextUrl ?? scannerBaseUrl,
        enabledToolbarTools: nextTools,
        toolbarTheme: nextTheme ?? toolbarTheme,
      });
    } catch (error) {}
    try {
      if (typeof localStorage !== "undefined") {
        if (nextUrl) localStorage.setItem("scannerBaseUrl", String(nextUrl));
        localStorage.setItem("enabledToolbarTools", JSON.stringify(nextTools));
        localStorage.setItem("toolbarTheme", String(nextTheme ?? toolbarTheme));
      }
    } catch (error) {}
  };

  const handleResetToolbar = () => {
    const defaults = TOOLBAR_TOOLS.map((t) => t.id);
    setEnabledTools(defaults);
    setToolbarTheme("stone");
    persistSettings(defaults, undefined, "stone");
  };

  const handleResetDeployment = () => {
    setScannerBaseUrl(HOSTED_URL);
    persistSettings(enabledTools, HOSTED_URL);
  };

  const toggleTool = (toolId: string) => {
    setEnabledTools((prev) => {
      const next = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      persistSettings(next);
      return next;
    });
  };

  const handleToggleSource = (source: keyof CMDKSettings["enabledSources"]) => {
    const newSettings = {
      ...cmdkSettings,
      enabledSources: {
        ...cmdkSettings.enabledSources,
        [source]: !cmdkSettings.enabledSources[source],
      },
    };
    setCmdkSettings(newSettings);
    chrome.storage.sync.set({ cmdkSettings: newSettings });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...cmdkSettings.sourceOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    const newSettings = {
      ...cmdkSettings,
      sourceOrder: newOrder,
    };
    setCmdkSettings(newSettings);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    chrome.storage.sync.set({ cmdkSettings: cmdkSettings });
  };

  const handleResetCMDK = () => {
    const defaults = createDefaultCmdkSettings();
    setCmdkSettings(defaults);
    chrome.storage.sync.set({ cmdkSettings: defaults }, () => {
      notifyUpcHighlighterChange(defaults.upcHighlighter.enabled);
    });
  };

  const handleToggleUpcHighlighter = (enabled: boolean) => {
    const newSettings = {
      ...cmdkSettings,
      upcHighlighter: {
        enabled,
      },
    };
    setCmdkSettings(newSettings);
    chrome.storage.sync.set({ cmdkSettings: newSettings }, () => {
      notifyUpcHighlighterChange(enabled);
    });
  };

  const sourcesConfig = {
    tabs: {
      key: "tabs" as const,
      label: "Tabs",
      description: "Search and switch between open browser tabs",
    },
    bookmarks: {
      key: "bookmarks" as const,
      label: "Bookmarks",
      description: "Access your saved bookmarks",
    },
    history: {
      key: "history" as const,
      label: "Recent History",
      description: "View recently visited pages",
    },
    quickLinks: {
      key: "quickLinks" as const,
      label: "Quick Links",
      description: "CSV-based custom links organized by category",
    },
    tools: {
      key: "tools" as const,
      label: "Tools",
      description: "PayMore extension tools and features",
    },
    searchProviders: {
      key: "searchProviders" as const,
      label: "Search Providers",
      description: "Google, YouTube, Amazon, and other search engines",
    },
    ebayCategories: {
      key: "ebayCategories" as const,
      label: "eBay Categories",
      description: "Live eBay category suggestions as you type",
    },
  };

  const usingLocalhost = /localhost(:\d+)?$/.test(
    String(scannerBaseUrl).replace(/https?:\/\//, "")
  );

  const sources = cmdkSettings.sourceOrder
    .map((key) => sourcesConfig[key as keyof typeof sourcesConfig])
    .filter(Boolean);

  // no local icon map — icons come from TOOLBAR_TOOLS.reactIcon or TOOLBAR_TOOLS.svg

  return (
    <div className="p-2 space-y-6 pm-scroll">
      <Accordion type="multiple" defaultValue={["cmdk"]} className="space-y-4">
        <AccordionItem value="cmdk" className="border-none">
          <Card className="border-stone-200">
            <CardHeader>
              <AccordionTrigger className="hover:no-underline">
                <div>
                  <CardTitle className="mb-2">Command Menu Sources</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Configure sources and order for the command menu popup.
                  </p>
                </div>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div
                      key={source.key}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 flex items-start gap-3 border border-stone-200 rounded-md hover:bg-stone-50 transition-colors cursor-move ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <button
                        className="p-1 text-stone-400 hover:text-stone-600 cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Menu className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm">{source.label}</h3>
                          {cmdkSettings.enabledSources[source.key] && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600">
                          {source.description}
                        </p>
                      </div>
                      <Switch
                        checked={cmdkSettings.enabledSources[source.key]}
                        onCheckedChange={() => handleToggleSource(source.key)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetCMDK}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="toolbar" className="border-none">
          <Card className="border-stone-200">
            <CardHeader>
              <AccordionTrigger className="hover:no-underline">
                <div>
                  <CardTitle className="mb-2">Toolbar Tools</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Select the tools you want to see in the toolbar.
                  </p>
                </div>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2">
            {TOOLBAR_TOOLS.map((tool) => {
              const active = enabledTools.includes(tool.id);
              // render icon: prefer reactIcon (Lucide component), then raw svg markup, then image
              const iconSvg = (() => {
                // @ts-ignore
                const ReactComp = (tool as any).reactIcon;
                if (ReactComp) return <ReactComp className="h-5 w-5" />;
                // @ts-ignore
                const rawSvg = (tool as any).svg;
                if (rawSvg) {
                  return (
                    <span
                      className="inline-block h-6 w-6"
                      dangerouslySetInnerHTML={{ __html: rawSvg }}
                    />
                  );
                }
                // @ts-ignore
                const img = (tool as any).img;
                if (img) {
                  return (
                    <img
                      src={img}
                      alt={tool.label}
                      className="h-6 w-6 object-contain"
                    />
                  );
                }
                return <span className="text-xs">{tool.label}</span>;
              })();

              return (
                <Toggle
                  key={tool.id}
                  data-state={active ? "on" : "off"}
                  variant="outline"
                  className={`h-20 flex flex-col items-center justify-center text-center select-none ${
                    active ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => toggleTool(tool.id)}
                  aria-pressed={active}
                >
                  <div className="mb-1">{iconSvg}</div>
                  <span className="text-xs font-medium leading-tight">
                    {tool.label}
                  </span>
                </Toggle>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-stone-200">
            <div className="mb-2 text-sm font-medium">Toolbar Color</div>
            <div className="grid grid-cols-6 gap-2">
              {[
                { id: "stone", bg: "bg-stone-800" },
                { id: "zinc", bg: "bg-zinc-800" },
                { id: "slate", bg: "bg-slate-800" },
                { id: "blue", bg: "bg-blue-700" },
                { id: "emerald", bg: "bg-emerald-700" },
                { id: "rose", bg: "bg-rose-700" },
                { id: "violet", bg: "bg-violet-700" },
                { id: "orange", bg: "bg-orange-700" },
                { id: "indigo", bg: "bg-indigo-700" },
                { id: "teal", bg: "bg-teal-700" },
                { id: "cyan", bg: "bg-cyan-700" },
                { id: "amber", bg: "bg-amber-700" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-label={`Theme ${opt.id}`}
                  onClick={() => {
                    setToolbarTheme(opt.id);
                    persistSettings(enabledTools, undefined, opt.id);
                  }}
                  className={`h-8 w-8 rounded-md border ${
                    toolbarTheme === opt.id
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "border-stone-300"
                  } ${opt.bg}`}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Affects the floating toolbar colors on web pages.
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToolbar}
            >
              Reset to Defaults
            </Button>
          </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="deployment" className="border-none">
          <Card className="border-stone-200">
            <CardHeader>
              <AccordionTrigger className="hover:no-underline">
                <div>
                  <CardTitle className="mb-2">Deployment</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Configure the deployment URL for hosted tools.
                  </p>
                </div>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
              <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="scanner-url">Deployment URL</Label>
            <Input
              id="scanner-url"
              type="url"
              value={scannerBaseUrl}
              onChange={(e) => {
                const newUrl = e.target.value;
                setScannerBaseUrl(newUrl);
                persistSettings(enabledTools, newUrl);
              }}
            />
            <div className="text-xs text-muted-foreground">
              Used by popup and hosted tools.
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-sm font-medium">Use localhost</div>
              <div className="text-xs text-muted-foreground">
                Quick toggle for {LOCAL_URL}
              </div>
            </div>
            <Switch
              checked={usingLocalhost}
              onCheckedChange={(checked) => {
                const newUrl = checked ? LOCAL_URL : HOSTED_URL;
                setScannerBaseUrl(newUrl);
                persistSettings(enabledTools, newUrl);
              }}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-stone-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDeployment}
            >
              Reset to Defaults
            </Button>
          </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="upc" className="border-none">
          <Card className="border-stone-200">
            <CardHeader>
              <AccordionTrigger className="hover:no-underline">
                <div>
                  <CardTitle className="mb-2">UPC Highlighter</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Automatically detect 12-digit UPC codes on web pages and enable click-to-copy.
                  </p>
                </div>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
              <CardContent className="flex items-start justify-between gap-4 pt-0">
                <div className="text-sm text-stone-600">
                  Toggle this on to highlight UPC values inline while browsing inventory pages.
                </div>
                <Switch
                  checked={cmdkSettings.upcHighlighter.enabled}
                  onCheckedChange={(checked) => handleToggleUpcHighlighter(!!checked)}
                />
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
