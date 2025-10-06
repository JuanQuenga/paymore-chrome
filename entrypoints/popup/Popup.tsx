import {
  AlertCircle,
  Box,
  Check,
  Database,
  FileText,
  Settings as SettingsIcon,
  TabletSmartphone,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Badge } from "../../src/components/ui/badge";
import { Button } from "../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";
import { Progress } from "../../src/components/ui/progress";
import { Settings } from "./Settings";
/* global chrome */
declare const chrome: any;

// Extension popup component

class ErrorBoundary extends Component<any, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Popup crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-red-600">
          <div className="font-semibold mb-2">
            Something went wrong in the popup.
          </div>
          <pre className="whitespace-pre-wrap text-xs text-red-700/80">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Popup() {
  const [extVersion, setExtVersion] = useState<string | null>(null);

  useEffect(() => {
    // set extension version from manifest if available
    try {
      const manifest =
        chrome.runtime && chrome.runtime.getManifest
          ? chrome.runtime.getManifest()
          : null;
      if (manifest && manifest.version) setExtVersion(String(manifest.version));
    } catch (error) {}
  }, []);

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      <header className="bg-stone-950 flex-shrink-0">
        <div className="flex items-center justify-center p-3">
          <div className="flex items-center gap-2">
            <img
              src="/assets/images/paymore.svg"
              alt="Paymore"
              className="h-6"
            />
            {extVersion && (
              <span className="text-xs text-muted-foreground">
                v{extVersion}
              </span>
            )}
          </div>
        </div>
      </header>

      <Settings />
    </div>
  );
}
