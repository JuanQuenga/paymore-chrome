import * as React from "react";
import { TOOLBAR_TOOLS } from "../../lib/tools";

function getIconElement(tool: any) {
  try {
    if (tool.reactIcon) {
      const Icon = tool.reactIcon;
      return <Icon size={20} className="pm-icon" />;
    }
    if (tool.img) {
      const src = (() => {
        try {
          return (window as any).chrome?.runtime?.getURL
            ? (window as any).chrome.runtime.getURL(
                String(tool.img).replace(/^\//, "")
              )
            : String(tool.img).replace(/^\//, "");
        } catch (error) {
          return String(tool.img).replace(/^\//, "");
        }
      })();
      return <img className="pm-icon" src={src} alt={tool.label} />;
    }
    if (tool.svg) {
      return (
        <span
          className="pm-icon"
          dangerouslySetInnerHTML={{ __html: String(tool.svg) }}
        />
      );
    }
  } catch (error) {}
  return null;
}

export default function Toolbar() {
  return (
    <div id="paymore-toolbar" aria-hidden="true">
      <style
        dangerouslySetInnerHTML={{
          __html: `
  /* Toolbar CSS (inlined) */
  #paymore-toolbar { position: fixed; right: -100px; top: 50%; transform: translateY(-50%); z-index: 2147483646; opacity: 1; visibility: visible; transition: right 0.3s ease, opacity 0.3s ease, visibility 0.3s ease; }
  #paymore-toolbar.visible { opacity: 1; visibility: visible; right: 9px; }
  #paymore-toolbar.hidden { opacity: 0; visibility: hidden; right: -100px; }
  /* Dismiss button slide animation */
  .pm-toolbar-wrapper { position: relative; overflow: visible; }
  .pm-dismiss-container { position: absolute; top: -42px; left: 50%; transform: translateX(-50%); width: 42px; height: 42px; overflow: hidden; z-index: 5; }
  .pm-dismiss-btn { position: absolute; top: 42px; left: 50%; transform: translateX(-50%); transition: top 0.3s ease; }
  .pm-toolbar-wrapper:hover .pm-dismiss-btn { top: 0; }
  /* Color variables (defaults = stone theme) */
  #paymore-toolbar {
    --pm-bg: #1c1917;           /* stone-900 */
    --pm-surface: #292524;      /* stone-800 */
    --pm-border: #57534e;       /* stone-500 */
    --pm-border-soft: #44403c;  /* stone-700 */
    --pm-foreground: #e7e5e4;   /* stone-200 */
    --pm-foreground-strong: #f5f5f4; /* stone-100 */
    --pm-hover: #3a3532;        /* stone-700 */
    --pm-badge: #ef4444;        /* red-500 */
  }

  /* Theme variants */
  #paymore-toolbar.pm-theme-zinc { --pm-bg: #18181b; --pm-surface: #27272a; --pm-border: #52525b; --pm-border-soft: #3f3f46; --pm-foreground: #f4f4f5; --pm-foreground-strong: #fafafa; --pm-hover: #3f3f46; }
  #paymore-toolbar.pm-theme-slate { --pm-bg: #0f172a; --pm-surface: #1e293b; --pm-border: #475569; --pm-border-soft: #334155; --pm-foreground: #e2e8f0; --pm-foreground-strong: #f8fafc; --pm-hover: #334155; }
  #paymore-toolbar.pm-theme-blue { --pm-bg: #1e3a8a; --pm-surface: #1e40af; --pm-border: #1d4ed8; --pm-border-soft: #1e40af; --pm-foreground: #eff6ff; --pm-foreground-strong: #ffffff; --pm-hover: #1d4ed8; }
  #paymore-toolbar.pm-theme-emerald { --pm-bg: #064e3b; --pm-surface: #065f46; --pm-border: #047857; --pm-border-soft: #059669; --pm-foreground: #ecfdf5; --pm-foreground-strong: #ffffff; --pm-hover: #047857; }
  #paymore-toolbar.pm-theme-rose { --pm-bg: #881337; --pm-surface: #9f1239; --pm-border: #be123c; --pm-border-soft: #e11d48; --pm-foreground: #fff1f2; --pm-foreground-strong: #ffffff; --pm-hover: #be123c; }
  #paymore-toolbar.pm-theme-violet { --pm-bg: #312e81; --pm-surface: #3730a3; --pm-border: #6d28d9; --pm-border-soft: #7c3aed; --pm-foreground: #f5f3ff; --pm-foreground-strong: #ffffff; --pm-hover: #4338ca; }
  #paymore-toolbar.pm-theme-orange { --pm-bg: #7c2d12; --pm-surface: #9a3412; --pm-border: #c2410c; --pm-border-soft: #ea580c; --pm-foreground: #fff7ed; --pm-foreground-strong: #ffffff; --pm-hover: #b45309; }
  #paymore-toolbar.pm-theme-indigo { --pm-bg: #312e81; --pm-surface: #3730a3; --pm-border: #4338ca; --pm-border-soft: #4f46e5; --pm-foreground: #eef2ff; --pm-foreground-strong: #ffffff; --pm-hover: #4338ca; }
  #paymore-toolbar.pm-theme-teal { --pm-bg: #0f766e; --pm-surface: #115e59; --pm-border: #14b8a6; --pm-border-soft: #2dd4bf; --pm-foreground: #ecfeff; --pm-foreground-strong: #ffffff; --pm-hover: #0d9488; }
  #paymore-toolbar.pm-theme-cyan { --pm-bg: #155e75; --pm-surface: #0e7490; --pm-border: #06b6d4; --pm-border-soft: #22d3ee; --pm-foreground: #ecfeff; --pm-foreground-strong: #ffffff; --pm-hover: #0891b2; }
  #paymore-toolbar.pm-theme-amber { --pm-bg: #78350f; --pm-surface: #92400e; --pm-border: #d97706; --pm-border-soft: #f59e0b; --pm-foreground: #fffbeb; --pm-foreground-strong: #ffffff; --pm-hover: #b45309; }

  .pm-tb { display: flex; flex-direction: column; gap: 6px; padding: 6px; background: var(--pm-bg); border: 1px solid var(--pm-border-soft); border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); user-select: none; position: relative; z-index: 10; }
  .pm-tb-close { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 6px; background: var(--pm-surface); border: 1px solid var(--pm-border); color: var(--pm-foreground); cursor: pointer; position: relative; margin-bottom: 2px; transition: all 0.2s ease; }
  .pm-tb-divider { width: 100%; height: 1px; background: var(--pm-border-soft); margin: 0 0 2px 0; border-radius: 0.5px; }
  .pm-tb-item { position: relative; }
  .pm-tb-btn { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: var(--pm-surface); border: 1px solid var(--pm-border); color: var(--pm-foreground); cursor: pointer; position: relative; transition: all 0.2s ease; }
  .pm-tip { position: absolute; right: 110%; top: 50%; transform: translateY(-50%); background: var(--pm-bg); border: 1px solid var(--pm-border-soft); color: var(--pm-foreground-strong); padding: 6px 8px; border-radius: 8px; font-size: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.35); white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s ease, transform 0.15s ease; }
  .pm-tb-item:hover .pm-tip { opacity: 1; transform: translateY(-50%) translateX(-2px); }
  .pm-icon { width: 22px; height: 22px; display: block; object-fit: contain; object-position: center; margin: 0 auto; }
  .pm-tb-close:hover, .pm-tb-btn:hover { background: var(--pm-hover); border-color: var(--pm-border); }
  .pm-badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; background: var(--pm-badge); color: #fff; border-radius: 9999px; font-size: 11px; line-height: 18px; text-align: center; border: 1px solid rgba(0,0,0,0.3); display: none; }
        `,
        }}
      />

      {/* Toolbar wrapper for hover effects */}
      <div className="pm-toolbar-wrapper">
        <div className="pm-tb" role="toolbar">
          {/* Dismiss button container with slide animation */}
          <div className="pm-dismiss-container">
            <div className="pm-dismiss-btn">
              <button
                className="pm-tb-close"
                id="pm-tb-close"
                aria-label="Dismiss Toolbar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
              <div className="pm-tip">Dismiss (⌘⇧L)</div>
            </div>
          </div>
          {TOOLBAR_TOOLS.map((tool) => (
            <div className="pm-tb-item" key={tool.id} style={{ display: "" }}>
              <button
                className="pm-tb-btn"
                id={tool.buttonId}
                aria-label={tool.label}
              >
                {getIconElement(tool)}
              </button>
              <div className="pm-tip">{tool.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
