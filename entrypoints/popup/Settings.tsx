import { useState, useEffect } from "react";
import { Button } from "../../src/components/ui/button";
import { Input } from "../../src/components/ui/input";
import { Label } from "../../src/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import { Checkbox } from "../../src/components/ui/checkbox";
import { Toggle } from "../../src/components/ui/toggle";
import { Switch } from "../../src/components/ui/switch";
import { TOOLBAR_TOOLS } from "../../src/lib/tools";
/* global chrome */
declare const chrome: any;

export function Settings() {
  const HOSTED_URL = "https://paymore-extension.vercel.app";
  const LOCAL_URL = "http://localhost:3000";

  const [scannerBaseUrl, setScannerBaseUrl] = useState(HOSTED_URL);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [toolbarTheme, setToolbarTheme] = useState<string>("stone");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSave = () => {
    setSaving(true);
    try {
      persistSettings(enabledTools, scannerBaseUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save settings:", e);
    } finally {
      setSaving(false);
    }
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

  const usingLocalhost = /localhost(:\d+)?$/.test(
    String(scannerBaseUrl).replace(/https?:\/\//, "")
  );

  // no local icon map — icons come from TOOLBAR_TOOLS.reactIcon or TOOLBAR_TOOLS.svg

  return (
    <div className="p-2 space-y-6 pm-scroll">
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="mb-2">Toolbar Tools</CardTitle>
          Select the tools you want to see in the toolbar.
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle>Deployment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="scanner-url">Deployment URL</Label>
            <Input
              id="scanner-url"
              type="url"
              value={scannerBaseUrl}
              onChange={(e) => setScannerBaseUrl(e.target.value)}
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
              onCheckedChange={(checked) =>
                setScannerBaseUrl(checked ? LOCAL_URL : HOSTED_URL)
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const defaults = TOOLBAR_TOOLS.map((t) => t.id);
            setEnabledTools(defaults);
            setToolbarTheme("stone");
            persistSettings(defaults, undefined, "stone");
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
