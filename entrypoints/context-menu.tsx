// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* global chrome */

import { defineContentScript } from "wxt/utils/define-content-script";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Search,
  Barcode,
  PackageSearch,
  TrendingUp,
  Gamepad2,
  Copy,
  Clipboard,
  ExternalLink,
  Download,
  XCircle,
  Printer,
  Settings,
  Trash2,
} from "lucide-react";

/**
 * Context Menu Content Script
 * - Light theme, rounded, shadowed menu
 * - Keyboard: Up/Down/Enter/Esc
 * - Alt+right-click => native menu
 * - Works everywhere including inputs/contentEditable
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    if (window.top !== window) return;

    const log = (...args) => {
      try {
        console.log("[PayMore CtxMenu]", ...args);
      } catch (_) {}
    };

    // Feature flag from settings
    let enabled = true;
    let dismissedUntilRefresh = false;
    try {
      chrome.storage.sync.get(["cmdkSettings"], (result) => {
        const s = result?.cmdkSettings || {};
        enabled = s?.contextMenu?.enabled ?? s?.radialMenu?.enabled ?? true;
      });
    } catch (_) {}

    if ((document as any)._paymoreCtxMenuInstalled) return;
    (document as any)._paymoreCtxMenuInstalled = true;

    type MenuAction = {
      id: string;
      label: string;
      shortcut?: string;
      description?: string;
      icon?: React.ComponentType<{ size?: number }>;
      requiresSelection?: boolean;
      requiresUrl?: boolean;
      onInvoke: (ctx: { x: number; y: number; selection: string }) => void;
    };

    const openUrl = (url: string) => {
      try {
        chrome.runtime.sendMessage({ action: "openUrl", url });
      } catch (_) {}
    };
    const openInSidebar = (tool: string) => {
      try {
        chrome.runtime.sendMessage({
          action: "openInSidebar",
          tool,
        });
      } catch (_) {}
    };
    const buildEbaySoldUrl = (q: string) => {
      try {
        const u = new URL(
          "https://www.ebay.com/sch/i.html?_nkw=x&_sacat=0&_from=R40&_dmd=2&rt=nc&LH_Sold=1&LH_Complete=1"
        );
        u.searchParams.set("_nkw", q);
        return u.href;
      } catch (_) {
        return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
          q
        )}&LH_Sold=1&LH_Complete=1`;
      }
    };

    const copyToClipboard = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {}
    };

    const quickActions: MenuAction[] = [
      {
        id: "copy",
        label: "Copy",
        icon: Copy,
        requiresSelection: true,
        onInvoke: ({ selection }) => selection && copyToClipboard(selection),
      },
      {
        id: "paste",
        label: "Paste",
        icon: Clipboard,
        onInvoke: async () => {
          try {
            // Read from clipboard
            const text = await navigator.clipboard.readText();
            if (!text) return;

            // Try to find the target element in this order:
            // 1. The focused element before menu opened
            // 2. The clicked element
            // 3. The current active element
            let targetEl: HTMLElement | null =
              focusedElementBeforeMenu ||
              clickedElement ||
              (document.activeElement as HTMLElement);

            // If the target is the clicked element but it's not an input,
            // check if it's inside a contentEditable or look for a nearby input
            if (
              targetEl &&
              targetEl.tagName !== "INPUT" &&
              targetEl.tagName !== "TEXTAREA" &&
              !targetEl.isContentEditable
            ) {
              // Check if clicked element is inside a contentEditable
              let parent = targetEl.parentElement;
              while (parent) {
                if (parent.isContentEditable) {
                  targetEl = parent;
                  break;
                }
                parent = parent.parentElement;
              }
            }

            if (
              targetEl &&
              (targetEl.tagName === "INPUT" || targetEl.tagName === "TEXTAREA")
            ) {
              // Handle input and textarea elements
              const input = targetEl as HTMLInputElement | HTMLTextAreaElement;

              // Focus the element first
              input.focus();

              const start = input.selectionStart || 0;
              const end = input.selectionEnd || 0;
              const value = input.value;

              // Insert text at cursor position
              input.value =
                value.substring(0, start) + text + value.substring(end);

              // Set cursor position after inserted text
              const newPos = start + text.length;
              input.setSelectionRange(newPos, newPos);

              // Trigger input event for React/frameworks
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
            } else if (targetEl && targetEl.isContentEditable) {
              // Handle contentEditable elements
              targetEl.focus();

              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));
                range.collapse(false);
              } else {
                // If no selection, try to insert at the end
                const range = document.createRange();
                range.selectNodeContents(targetEl);
                range.collapse(false);
                range.insertNode(document.createTextNode(text));
              }
            }
          } catch (err) {
            log("Paste error:", err);
          }
        },
      },
      {
        id: "open-in-new-tab",
        label: "Open in New Tab",
        icon: ExternalLink,
        requiresUrl: true,
        onInvoke: () => {
          if (clickedUrl) {
            try {
              log("Opening URL in new tab:", clickedUrl);
              chrome.runtime.sendMessage({
                action: "openUrl",
                url: clickedUrl,
              });
            } catch (_) {}
          }
        },
      },
      {
        id: "save-as",
        label: "Save",
        icon: Download,
        requiresUrl: true,
        onInvoke: () => {
          if (clickedUrl) {
            try {
              log("Downloading file:", clickedUrl);
              chrome.runtime.sendMessage(
                {
                  action: "downloadFile",
                  url: clickedUrl,
                },
                (response) => {
                  log("Download response:", response);
                }
              );
            } catch (err) {
              log("Download error:", err);
            }
          } else {
            log("No URL to download");
          }
        },
      },
      {
        id: "delete-element",
        label: "Delete Element",
        icon: Trash2,
        onInvoke: () => {
          try {
            if (clickedElement) {
              // Store the element to delete
              const elementToDelete = clickedElement;

              // Close menu first
              closeMenu();

              // Add a fade-out animation before removing
              elementToDelete.style.transition = "opacity 0.2s";
              elementToDelete.style.opacity = "0";

              // Remove element after animation
              setTimeout(() => {
                elementToDelete.remove();
                log("Element deleted:", elementToDelete);
              }, 200);
            } else {
              log("No element to delete");
            }
          } catch (err) {
            log("Delete element error:", err);
          }
        },
      },
      {
        id: "print",
        label: "Print",
        icon: Printer,
        onInvoke: () => {
          try {
            // Close menu first, then print after a brief delay to ensure menu is hidden
            closeMenu();
            setTimeout(() => {
              window.print();
            }, 100);
          } catch (err) {
            log("Print error:", err);
          }
        },
      },
      {
        id: "dismiss",
        label: "Close",
        icon: XCircle,
        onInvoke: () => {
          dismissedUntilRefresh = true;
          closeMenu();
        },
      },
    ];

    const actions: MenuAction[] = [
      {
        id: "upc-google",
        label: "Google for UPC",
        shortcut: "G",
        description: "Find UPC codes on Google",
        icon: Search,
        requiresSelection: true,
        onInvoke: ({ selection }) =>
          selection &&
          openUrl(
            `https://www.google.com/search?q=${encodeURIComponent(
              "UPC for " + selection
            )}`
          ),
      },
      {
        id: "mpn-google",
        label: "Google for MPN",
        shortcut: "M",
        description: "Find manufacturer part numbers on Google",
        icon: Search,
        requiresSelection: true,
        onInvoke: ({ selection }) =>
          selection &&
          openUrl(
            `https://www.google.com/search?q=${encodeURIComponent(
              "MPN for " + selection
            )}`
          ),
      },
      {
        id: "ebay-sold",
        label: "Search eBay (Sold)",
        shortcut: "E",
        description: "Search for sold listings on eBay",
        icon: PackageSearch,
        requiresSelection: true,
        onInvoke: ({ selection }) =>
          selection && openUrl(buildEbaySoldUrl(selection)),
      },
      {
        id: "upcitemdb",
        label: "Search UPCItemDB",
        shortcut: "U",
        description: "Look up product information by UPC",
        icon: Barcode,
        requiresSelection: true,
        onInvoke: ({ selection }) =>
          selection &&
          openUrl(
            `https://www.upcitemdb.com/upc/${encodeURIComponent(selection)}`
          ),
      },
      {
        id: "pricecharting",
        label: "Search PriceCharting",
        shortcut: "P",
        description: "Check prices for collectibles and games",
        icon: TrendingUp,
        requiresSelection: true,
        onInvoke: ({ selection }) =>
          selection &&
          openUrl(
            `https://www.pricecharting.com/search-products?type=prices&q=${encodeURIComponent(
              selection
            )}&go=Go`
          ),
      },
      {
        id: "controller",
        label: "Controller Testing",
        shortcut: "C",
        description: "Test game controllers",
        icon: Gamepad2,
        onInvoke: () => openInSidebar("controller-testing"),
      },
      {
        id: "settings",
        label: "Settings",
        shortcut: "S",
        description: "Open extension settings",
        icon: Settings,
        onInvoke: () => {
          try {
            chrome.runtime.sendMessage({ action: "open-settings" });
          } catch (_) {}
        },
      },
    ];

    // Shadow DOM
    let host: HTMLDivElement | null = null;
    let shadow: ShadowRoot | null = null;
    let rootEl: HTMLDivElement | null = null;
    let reactRoot: Root | null = null;

    const styles = () => `
      :host{all:initial}
      .paymore-cm-root{position:fixed;inset:0;z-index:2147483646}
      .overlay{position:fixed;inset:0;background:transparent}
      .menu{position:absolute;min-width:240px;max-width:320px;background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 20px 45px rgba(0,0,0,.18);overflow:hidden;font-family:ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif}
      .hdr{padding:8px 12px;border-bottom:1px solid #f3f4f6;font:600 12px/1 ui-sans-serif, system-ui, -apple-system;color:#6b7280;background:#fafafa}
      .quick-actions{display:flex;gap:4px;padding:8px;border-bottom:1px solid #f3f4f6;background:#fafafa}
      .icon-btn-wrapper{position:relative;display:inline-flex}
      .icon-btn{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;cursor:pointer;border:none;background:#fff;color:#374151;transition:all 0.15s}
      .icon-btn:hover:not(:disabled){background:#e5e7eb;color:#111827}
      .icon-btn:active:not(:disabled){background:#d1d5db}
      .icon-btn:disabled{opacity:0.4;cursor:not-allowed}
      .tooltip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:10}
      .tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#111827}
      .icon-btn-wrapper:hover .tooltip{opacity:1}
      .icon-btn:disabled + .tooltip{display:none}
      .group{padding:6px 6px}
      .item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;outline:none;font-size:14px;font-weight:400;transition:all 0.15s;position:relative}
      .item:hover:not(.disabled){background:#f3f4f6}
      .item[aria-selected="true"]:not(.disabled), .item:focus:not(.disabled){background:#e5e7eb}
      .item.disabled{opacity:0.4;cursor:not-allowed}
      .item-tooltip{position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);background:#111827;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:10;max-width:200px}
      .item:hover .item-tooltip{opacity:1;transition-delay:0.5s}
      .item.disabled .item-tooltip{display:none}
      .icon{width:18px;height:18px;color:#6b7280;display:flex;align-items:center;justify-content:center}
      .label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;line-height:1.5}
      .shortcut{color:#6b7280;font:600 11px/1 ui-sans-serif, system-ui, -apple-system}
      .sep{height:1px;background:#f3f4f6;margin:4px 0}
    `;

    const ensureHost = () => {
      if (host && shadow && rootEl) return;
      host = document.createElement("div");
      host.style.all = "initial";
      host.style.position = "fixed";
      host.style.inset = "0";
      host.style.zIndex = "2147483646";
      host.style.pointerEvents = "none"; // Initially hidden
      shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = styles();
      rootEl = document.createElement("div");
      rootEl.className = "paymore-cm-root";
      shadow.appendChild(style);
      shadow.appendChild(rootEl);
      document.documentElement.appendChild(host);
    };

    let isOpen = false;
    let lastSelection = "";
    let anchor = { x: 0, y: 0 };
    let clickedElement: HTMLElement | null = null;
    let clickedUrl = "";
    let focusedElementBeforeMenu: HTMLElement | null = null;
    // Windows-only quirk: after Alt+right-click, Chrome can dispatch a follow-up
    // contextmenu without Alt that causes our capture handler to interfere and
    // close the native menu. Track a short suppression window.
    let suppressUntil = 0;

    const getSelectionText = () => {
      try {
        return (window.getSelection()?.toString() || "").trim();
      } catch {
        return "";
      }
    };

    const closeMenu = () => {
      if (!isOpen) return;
      isOpen = false;
      try {
        // Render null to clear the menu but keep the root for reuse
        if (reactRoot && rootEl) {
          reactRoot.render(null);
        }
        // Hide the host to restore page interactivity
        if (host) {
          host.style.pointerEvents = "none";
        }
      } catch (_) {}
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("contextmenu", onContextMenuCapture, true);
    };

    const onScroll = () => closeMenu();
    const onContextMenuCapture = (e: MouseEvent) => {
      // Prevent page context menus while ours is open, but allow alt-click
      if (e.altKey) {
        // Don't interfere with native context menu on alt-click
        return;
      }
      // If we're within suppression window (post Alt+RC on Windows), do not
      // interfere so the native menu can remain open.
      if (Date.now() < suppressUntil) {
        return;
      }
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    };

    const openMenuAt = (x: number, y: number) => {
      if (isOpen) closeMenu();
      ensureHost();
      isOpen = true;

      // Show the host to allow menu interaction
      if (host) {
        host.style.pointerEvents = "auto";
      }

      // Create React root only once
      if (!reactRoot && rootEl) {
        reactRoot = createRoot(rootEl);
      }

      // Menu React component
      const Menu: React.FC = () => {
        const [index, setIndex] = useState(0);
        const items = useMemo(() => actions, []);
        const hasSelection = !!lastSelection;

        // Positioning within viewport
        const [pos, setPos] = useState({ left: x, top: y });
        useEffect(() => {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const width = 280; // approx
          const height = 12 + 6 + items.length * 40; // rough calc
          let left = x,
            top = y;
          if (left + width > vw - 8) left = vw - width - 8;
          if (top + height > vh - 8) top = vh - height - 8;
          setPos({ left, top });
        }, []);

        useEffect(() => {
          const handle = (ev: KeyboardEvent) => {
            if (ev.key === "ArrowDown") {
              ev.preventDefault();
              setIndex((i) => {
                let next = (i + 1) % items.length;
                // Skip disabled items
                while (items[next]?.requiresSelection && !hasSelection) {
                  next = (next + 1) % items.length;
                  if (next === i) break; // Prevent infinite loop
                }
                return next;
              });
            } else if (ev.key === "ArrowUp") {
              ev.preventDefault();
              setIndex((i) => {
                let prev = (i - 1 + items.length) % items.length;
                // Skip disabled items
                while (items[prev]?.requiresSelection && !hasSelection) {
                  prev = (prev - 1 + items.length) % items.length;
                  if (prev === i) break; // Prevent infinite loop
                }
                return prev;
              });
            } else if (ev.key === "Enter") {
              ev.preventDefault();
              const item = items[index];
              if (item && !(item.requiresSelection && !hasSelection)) {
                try {
                  item.onInvoke({ x, y, selection: lastSelection });
                } catch (_) {}
                closeMenu();
              }
            } else {
              // Check for letter shortcuts
              const key = ev.key.toUpperCase();
              const matchingItem = items.find(
                (item) => item.shortcut?.toUpperCase() === key
              );
              if (
                matchingItem &&
                !(matchingItem.requiresSelection && !hasSelection)
              ) {
                ev.preventDefault();
                try {
                  matchingItem.onInvoke({ x, y, selection: lastSelection });
                } catch (_) {}
                closeMenu();
              }
            }
          };
          document.addEventListener("keydown", handle, true);
          return () => document.removeEventListener("keydown", handle, true);
        }, [index, items, hasSelection]);

        const onOverlayClick = (e: React.MouseEvent) => {
          const path = (e.nativeEvent as any).composedPath?.() || [];
          const el = path[0] as HTMLElement;
          if (!(el.closest && el.closest(".menu"))) closeMenu();
        };

        const onItemClick = (i: number) => {
          const item = items[i];
          if (item && !(item.requiresSelection && !hasSelection)) {
            try {
              item.onInvoke({ x, y, selection: lastSelection });
            } catch (_) {}
            closeMenu();
          }
        };

        const onQuickActionClick = (action: MenuAction) => {
          if (action.requiresSelection && !hasSelection) return;
          if (action.requiresUrl && !clickedUrl) return;
          try {
            action.onInvoke({ x, y, selection: lastSelection });
          } catch (_) {}
          closeMenu();
        };

        return (
          <div
            className="overlay"
            onClick={onOverlayClick}
            onContextMenu={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
            }}
          >
            <div
              className="menu"
              style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
            >
              <div className="hdr">PayMore Quick Actions</div>
              <div className="quick-actions">
                {quickActions.map((action) => {
                  const Icon = action.icon || Search;
                  const isDisabled =
                    (action.requiresSelection && !hasSelection) ||
                    (action.requiresUrl && !clickedUrl);
                  return (
                    <div key={action.id} className="icon-btn-wrapper">
                      <button
                        className="icon-btn"
                        disabled={isDisabled}
                        onClick={() => onQuickActionClick(action)}
                      >
                        <Icon size={20} />
                      </button>
                      <div className="tooltip">{action.label}</div>
                    </div>
                  );
                })}
              </div>
              <div className="group">
                {items.map((item, i) => {
                  const Icon = item.icon || Search;
                  const selected = i === index;
                  const isDisabled = item.requiresSelection && !hasSelection;
                  return (
                    <div
                      key={item.id}
                      className={`item ${isDisabled ? "disabled" : ""}`}
                      role="menuitem"
                      tabIndex={0}
                      aria-selected={selected}
                      aria-disabled={isDisabled}
                      onMouseEnter={() => !isDisabled && setIndex(i)}
                      onClick={() => onItemClick(i)}
                    >
                      <div className="icon">
                        <Icon size={18} />
                      </div>
                      <div className="label">{item.label}</div>
                      <div className="shortcut">{item.shortcut}</div>
                      {item.description && (
                        <div className="item-tooltip">{item.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      };

      // Render the menu component (root already created above)
      if (reactRoot) {
        reactRoot.render(React.createElement(Menu));
      }

      // global listeners while open
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("scroll", onScroll, true);
      document.addEventListener("contextmenu", onContextMenuCapture, true);
    };

    const onContextMenu = (e: MouseEvent) => {
      // Alt+right-click shows native menu, otherwise show PayMore menu
      if (e.altKey || !enabled || dismissedUntilRefresh) {
        // For alt-click, ensure we don't interfere with native context menu
        // Remove any existing menu listeners temporarily to prevent flashing
        document.removeEventListener("contextmenu", onContextMenuCapture, true);
        // On Windows, a stray non-Alt contextmenu may follow the Alt+click.
        // Suppress our capture for a short window so native menu stays.
        const isWindows = navigator.platform.toLowerCase().includes("win");
        if (isWindows) suppressUntil = Date.now() + 350; // ~1/3 second
        return; // pass through
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      lastSelection = getSelectionText();
      anchor = { x: e.clientX, y: e.clientY };

      // Capture the currently focused element before the menu opens
      focusedElementBeforeMenu = document.activeElement as HTMLElement;

      // Capture clicked element and extract URL if it's a link or image
      clickedElement = e.target as HTMLElement;
      clickedUrl = "";

      // Check if clicked on a link or inside a link
      let element: HTMLElement | null = clickedElement;
      while (element && element !== document.body) {
        if (element.tagName === "A" && (element as HTMLAnchorElement).href) {
          clickedUrl = (element as HTMLAnchorElement).href;
          break;
        }
        if (element.tagName === "IMG" && (element as HTMLImageElement).src) {
          clickedUrl = (element as HTMLImageElement).src;
          break;
        }
        element = element.parentElement;
      }

      openMenuAt(anchor.x, anchor.y);
    };

    // Settings toggle
    try {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.action === "context-menu-settings-changed") {
          enabled = !!message.enabled;
          if (!enabled) closeMenu();
        }
      });
    } catch (_) {}

    document.addEventListener("contextmenu", onContextMenu, true);
    log("Context menu initialized");
  },
});
