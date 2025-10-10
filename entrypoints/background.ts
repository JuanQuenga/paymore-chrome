/**
 * PayMore Chrome Extension Background Service Worker
 * Migrated to WXT background entrypoint.
 */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* global chrome */
import { defineBackground } from "wxt/utils/define-background";

export default defineBackground({
  main() {
    /**
     * @fileoverview PayMore Chrome Extension Background Service Worker
     * @description Manages extension lifecycle, message handling, and core functionality
     * @version 1.0.0
     * @author PayMore Team
     * @license MIT
     *
     * This service worker handles:
     * - Extension installation and startup
     * - Message routing between content scripts and popup
     * - Side panel state management
     * - Storage configuration
     * - Tab communication and injection
     */

    // Paymore extension background service worker (MV3) with verbose debug logging

    /** @type {boolean} Debug mode flag for console logging */
    let DEBUG = true;

    /**
     * @type {Map<number, {open: boolean, tool: string}>}
     * Track side panel state per tab for toggle/switch functionality
     */
    const SIDE_PANEL_STATE = new Map(); // tabId -> { open: boolean, tool: string }
    const DEFAULT_ACTION_POPUP = "popup.html";
    const OPTIONS_ACTION_POPUP = "options.html";

    async function openOptionsAsActionPopup() {
      const manifest = chrome.runtime?.getManifest?.();
      const restoredPopup =
        (manifest?.action && manifest.action.default_popup) ||
        DEFAULT_ACTION_POPUP;

      try {
        await chrome.action.setPopup({ popup: OPTIONS_ACTION_POPUP });
        await chrome.action.openPopup();
        return true;
      } catch (error) {
        log("Failed to open options popup via action", error);
        return false;
      } finally {
        try {
          await chrome.action.setPopup({ popup: restoredPopup });
        } catch (restoreError) {
          log("Failed to restore default action popup", restoreError);
        }
      }
    }

    /**
     * Logs debug messages when DEBUG mode is enabled
     * @param {...any} args - Arguments to log
     */
    function log(...args) {
      if (DEBUG) console.log("[Paymore SW]", ...args);
    }

    log("Service worker booted", { time: new Date().toISOString() });

    // Track previous active tab for CMDK "return to previous tab" feature
    let previousActiveTabId = null;
    let lastActiveTabId = null;
    let currentActiveTabId = null; // Track current active tab for sidePanel.open user gesture requirement

    // Initialize currentActiveTabId on startup
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        currentActiveTabId = tabs[0].id;
        log("Initial active tab ID:", currentActiveTabId);
      }
    });

    chrome.tabs.onActivated.addListener(({ tabId }) => {
      try {
        if (lastActiveTabId && lastActiveTabId !== tabId) {
          previousActiveTabId = lastActiveTabId;
        }
        lastActiveTabId = tabId;
        currentActiveTabId = tabId; // Update current active tab for sidepanel opening
        log("Active tab changed to:", tabId);
      } catch (error) {
        /* noop */
      }
    });
    // Clean up tracking if tabs are closed
    try {
      chrome.tabs.onRemoved.addListener((closedTabId) => {
        if (previousActiveTabId === closedTabId) previousActiveTabId = null;
        if (lastActiveTabId === closedTabId) lastActiveTabId = null;
        if (currentActiveTabId === closedTabId) {
          currentActiveTabId = null;
          // Try to update to another active tab
          chrome.tabs.query(
            { active: true, lastFocusedWindow: true },
            (tabs) => {
              if (tabs && tabs[0]) currentActiveTabId = tabs[0].id;
            }
          );
        }
      });
    } catch (error) {
      /* noop */
    }

    // Listen for keyboard commands
    chrome.commands.onCommand.addListener((command) => {
      if (command === "toggle-toolbar") {
        log("Toggle toolbar command triggered");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_TOOLBAR" });
          }
        });
      } else if (command === "open-options") {
        log("Open options command triggered");
        openOptionsAsActionPopup().catch((error) =>
          log("openOptions command handler error", error)
        );
      } else if (command === "open-toolbar-sidepanel") {
        log("Open toolbar sidepanel command triggered");
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          const active = tabs && tabs[0];
          if (active?.id) {
            toggleSidePanelForTab(active.id, "floating-toolbar");
          }
        });
      }
    });

    // Create context menu items that operate on the current text selection
    try {
      const EBAY_SOLD_BASE =
        "https://www.ebay.com/sch/i.html?_nkw=iphone+15&_sacat=0&_from=R40&_dmd=2&rt=nc&LH_Sold=1&LH_Complete=1";
      const UPC_LOOKUP_BASE = "https://www.upcitemdb.com/upc/";
      const GOOGLE_UPC_BASE = "https://www.google.com/search?q=";
      const PRICE_CHARTING_BASE =
        "https://www.pricecharting.com/search-products?type=prices&q=grand+theft+auto&go=Go";

      // Ensure no stale items
      try {
        chrome.contextMenus.removeAll(() => {});
      } catch (error) {
        log("Suppressed error", error);
      }

      try {
        chrome.contextMenus.create({
          id: "pm-search-ebay-sold",
          title: "Search for sold listings on eBay",
          contexts: ["selection"],
        });
        chrome.contextMenus.create({
          id: "pm-search-google-upc",
          title: "Search for UPC on Google",
          contexts: ["selection"],
        });
        chrome.contextMenus.create({
          id: "pm-search-google-mpn",
          title: "Search for MPN on Google",
          contexts: ["selection"],
        });
        chrome.contextMenus.create({
          id: "pm-search-upc",
          title: "Search on UPCItemDB",
          contexts: ["selection"],
        });
        chrome.contextMenus.create({
          id: "pm-search-price-charting",
          title: "Search on PriceCharting",
          contexts: ["selection"],
        });
      } catch (e) {
        log("contextMenus.create error", e?.message || e);
      }

      chrome.contextMenus.onClicked.addListener((info, _tab) => {
        const selection = (info.selectionText || "").trim();
        if (!selection) return;

        if (info.menuItemId === "pm-search-ebay-sold") {
          try {
            const u = new URL(EBAY_SOLD_BASE);
            u.searchParams.set("_nkw", selection);
            chrome.tabs.create({ url: u.href });
          } catch (err) {
            // Fallback: naive replacement + encode
            try {
              const q = encodeURIComponent(selection);
              const url = EBAY_SOLD_BASE.replace(/_nkw=[^&]*/, `_nkw=${q}`);
              chrome.tabs.create({ url });
            } catch (error) {
              log("Failed to open eBay search for selection", selection);
            }
          }
          return;
        }

        if (info.menuItemId === "pm-search-upc") {
          try {
            const url = `${UPC_LOOKUP_BASE}${encodeURIComponent(selection)}`;
            chrome.tabs.create({ url });
          } catch (err) {
            log("Failed to open UPC search for selection", selection);
          }
          return;
        }

        if (info.menuItemId === "pm-search-google-upc") {
          try {
            const query = encodeURIComponent(`UPC for ${selection}`);
            chrome.tabs.create({ url: `${GOOGLE_UPC_BASE}${query}` });
          } catch (err) {
            log("Failed to open Google UPC search for selection", selection);
          }
          return;
        }

        if (info.menuItemId === "pm-search-google-mpn") {
          try {
            const query = encodeURIComponent(`MPN for ${selection}`);
            chrome.tabs.create({ url: `${GOOGLE_UPC_BASE}${query}` });
          } catch (err) {
            log("Failed to open Google MPN search for selection", selection);
          }
          return;
        }

        if (info.menuItemId === "pm-search-price-charting") {
          try {
            const u = new URL(PRICE_CHARTING_BASE);
            u.searchParams.set("q", selection);
            chrome.tabs.create({ url: u.href });
          } catch (err) {
            try {
              const q = encodeURIComponent(selection);
              const url = PRICE_CHARTING_BASE.replace(/q=[^&]*/, `q=${q}`);
              chrome.tabs.create({ url });
            } catch (error) {
              log("Failed to open PriceCharting search", selection);
            }
          }
          return;
        }

        // only known handlers kept
      });
    } catch (error) {
      /* noop */
    }

    // Provide a fetch fallback for content scripts that cannot fetch extension
    // resources directly due to page restrictions. Content scripts can request
    // `fetchResource` and the service worker will return the resource text.
    try {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.action === "fetchResource" && message?.url) {
          const url = chrome.runtime.getURL(message.url);
          fetch(url)
            .then((r) => {
              if (!r.ok)
                throw new Error("HTTP " + r.status + " " + r.statusText);
              return r.text();
            })
            .then((text) => sendResponse({ ok: true, html: text }))
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
          return true; // keep channel open for async response
        }
      });
    } catch (error) {
      log("Suppressed error", error);
    }

    /**
     * Handles extension installation and initial setup
     * Sets default storage values and configuration
     */
    chrome.runtime.onInstalled.addListener((details) => {
      log("onInstalled", details);
      chrome.storage.local.set({
        isEnabled: true,
        autoShowModal: true,
        vibrationEnabled: true,
        debugLogs: true,
        scannerBaseUrl: "https://paymore-extension.vercel.app",
        // Add extension-wide store settings
        pmSelectedStore: "", // "Taylor" or "Southgate"
        pmStoreRoom: "", // "taylor-store" or "southgate-store"
        // Add new site management settings
        disabledSites: [],
        currentSiteEnabled: true,
        globalEnabled: true,
      });
      if (details.reason === "install") {
        // Open onboarding page on fresh install to introduce the toolset
        chrome.tabs.create(
          { url: "https://paymore-extension.vercel.app/tools/preview" },
          () => {
            const error = chrome.runtime.lastError;
            if (error) log("Failed to open welcome tab", error);
          }
        );
      }
    });

    /**
     * Handles extension startup and configuration loading
     * Updates scanner base URL and initializes debug settings
     */
    chrome.runtime.onStartup?.addListener(() => {
      log("onStartup - updating scannerBaseUrl");
      chrome.storage.local.set({
        scannerBaseUrl: "https://paymore-extension.vercel.app",
      });
    });

    /**
     * Handles extension startup and configuration loading
     * Updates debug settings
     */
    chrome.runtime.onStartup?.addListener(() => {
      log("onStartup");
      chrome.storage.local.get({ debugLogs: true }, (cfg) => {
        DEBUG = !!cfg.debugLogs;
        log("Debug flag loaded", DEBUG);
      });
    });

    /**
     * Handles extension context invalidation and recovery
     * Sends heartbeat messages to content scripts to check if they're still valid
     */
    chrome.runtime.onSuspend?.addListener(() => {
      log("Extension suspended, cleaning up resources");
    });

    // Add message handler for extension health checks
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "EXTENSION_HEALTH_CHECK") {
        log("Extension health check received from tab:", sender.tab?.id);
        sendResponse({ status: "healthy", timestamp: Date.now() });
        return true;
      }

      if (message.type === "CONTENT_SCRIPT_READY") {
        log("Content script ready notification from tab:", sender.tab?.id);
        sendResponse({ status: "acknowledged" });
        return true;
      }
    });

    /**
     * Sends a message to the currently active tab
     * Creates a new tab if no injectable tab is available
     * @param {Object} message - Message to send to the tab
     */
    function sendToActiveTab(message) {
      log("sendToActiveTab", message);
      chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
        const isInjectable = (u = "") => /^(https?:|file:|ftp:)/.test(u);
        const active = tabs.find((t) => t.active);
        let target =
          active && isInjectable(active.url)
            ? active
            : tabs.find((t) => isInjectable(t.url));

        if (!target) {
          log("No injectable tab in currentWindow; creating a new one");
          chrome.tabs.create({ url: "https://example.com" }, (newTab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === newTab.id && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                deliverToTab(newTab.id, message);
              }
            });
          });
          return;
        }

        // Allow localhost/127.0.0.1 during development

        deliverToTab(target.id, message);
      });
    }

    /**
     * Returns content script declarations from the manifest so hashed bundles can be executed.
     * @returns {chrome.runtime.ManifestV3['content_scripts']} Manifest content scripts array.
     */
    function getManifestContentScripts() {
      try {
        return chrome.runtime.getManifest()?.content_scripts || [];
      } catch (error) {
        return [];
      }
    }

    /**
     * Ensures content scripts declared in the manifest are injected.
     * @param {number} tabId - Target tab ID
     */
    function injectManifestContentScripts(tabId) {
      const entries = getManifestContentScripts();
      entries.forEach((entry) => {
        const target = { tabId, allFrames: Boolean(entry.all_frames) };
        (entry.css || []).forEach((file) => {
          try {
            chrome.scripting.insertCSS({ target, files: [file] });
          } catch (error) {
            /* noop */
          }
        });
        (entry.js || []).forEach((file) => {
          try {
            chrome.scripting.executeScript({ target, files: [file] });
          } catch (error) {
            /* noop */
          }
        });
      });
    }

    /**
     * Delivers a message to a specific tab with retry logic
     * Handles content script injection if needed
     * @param {number} tabId - Target tab ID
     * @param {Object} message - Message to deliver
     */
    function deliverToTab(tabId, message) {
      const trySend = (attempt) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            log(`send attempt ${attempt} failed`, lastErr.message);
            if (attempt === 1) {
              // Try explicit injection then retry once
              log("injecting content script via scripting API");
              injectManifestContentScripts(tabId);
              setTimeout(() => trySend(2), 500);
            } else if (attempt === 2) {
              // Final fallback: postMessage into page
              log("final fallback: postMessage showControllerModal");
              chrome.scripting.executeScript({
                target: { tabId, allFrames: true },
                func: () =>
                  window.postMessage(
                    { source: "paymore", action: "showControllerModal" },
                    "*"
                  ),
              });
            }
          } else {
            log("Message delivered; response=", response);
          }
        });
      };
      trySend(1);
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      log("onMessage", {
        message,
        sender: { id: sender?.tab?.id, url: sender?.tab?.url },
      });

      switch (message.action) {
        case "csReady":
          log("content script ready", message?.url);
          sendResponse({ ok: true });
          break;
        case "openInActionPopup": {
          const tool = message?.tool;
          if (!tool) {
            sendResponse({ success: false, error: "missing_tool" });
            break;
          }
          openInActionPopup(tool);
          sendResponse({ success: true });
          break;
        }
        case "openInSidebar": {
          const tool = message?.tool;
          if (!tool) {
            sendResponse({ success: false, error: "missing_tool" });
            break;
          }
          toggleSidePanelForTab(sender?.tab?.id, tool);
          sendResponse({ success: true });
          break;
        }
        case "openToolbarCustomization": {
          const intentKey = "popupIntent";
          const intentValue = "toolbar-customization";
          let notifyQueued = false;
          const notifyPopup = () => {
            if (notifyQueued) return;
            notifyQueued = true;
            setTimeout(() => {
              try {
                chrome.runtime.sendMessage({
                  action: "toolbarCustomizationIntent",
                });
              } catch (e) {
                log("openToolbarCustomization notify error", e?.message || e);
              }
            }, 100);
          };

          chrome.storage.local.set({ [intentKey]: intentValue });
          // Try to open the action popup; if that fails (no user gesture or other
          // restriction), fall back to opening the popup page as a normal window.
          try {
            chrome.action.openPopup(() => {
              const err = chrome.runtime.lastError;
              if (err) {
                log("openPopup error", err.message);
                try {
                  chrome.windows.create({
                    url: chrome.runtime.getURL("popup.html"),
                    type: "popup",
                    width: 480,
                    height: 640,
                    focused: true,
                  });
                } catch (error) {
                  log("Suppressed error", error);
                }
              }
              notifyPopup();
            });
          } catch (e) {
            log("openToolbarCustomization openPopup threw", e?.message || e);
            try {
              chrome.windows.create({
                url: chrome.runtime.getURL("popup.html"),
                type: "popup",
                width: 480,
                height: 640,
                focused: true,
              });
            } catch (error) {
              log("Suppressed error", error);
            }
            notifyPopup();
          }
          sendResponse({ success: true });
          break;
        }
        case "closeSidebar": {
          const tabId = sender?.tab?.id;
          if (tabId) {
            try {
              chrome.sidePanel.close({ tabId });
              SIDE_PANEL_STATE.set(tabId, { open: false, tool: null });
              log(`Sidepanel closed for tab: ${tabId}`);
            } catch (e) {
              log("sidePanel close error", e?.message || e);
            }
          }
          sendResponse({ success: true });
          break;
        }
        case "openToolWindow": {
          const tool = message?.tool;
          if (!tool) {
            sendResponse({ success: false, error: "missing_tool" });
            break;
          }
          // Open near toolbar by default (right-middle of primary work area)
          try {
            chrome.system.display.getInfo((displays) => {
              const d = (displays && displays[0] && displays[0].workArea) || {
                left: 0,
                top: 0,
                width: 1280,
                height: 800,
              };
              const anchor = {
                x: d.left + d.width - 72,
                y: d.top + Math.floor(d.height / 2),
              };
              openToolNear(tool, anchor, 0.4);
            });
          } catch (error) {
            openToolNear(tool, { x: 1200, y: 600 }, 0.4);
          }
          sendResponse({ success: true });
          break;
        }
        case "openToolWindowAt": {
          const tool = message?.tool;
          const anchor = message?.anchor || {};
          if (!tool) {
            sendResponse({ success: false, error: "missing_tool" });
            break;
          }
          // Open tool window near the click
          openToolNear(tool, anchor, 0.4);
          sendResponse({ success: true });
          break;
        }
        case "resizeToolForTab": {
          const width = Number(message?.width || 0);
          const height = Number(message?.height || 0);
          resizeFocusedPopup(width || null, height || null);
          sendResponse({ success: true });
          break;
        }
        case "getControllerStatus":
          // Hook for future background gamepad monitoring
          sendResponse({ connected: false, name: null });
          break;
        case "triggerControllerTest":
          openControllerTest();
          sendResponse({ success: true });
          break;
        case "openCheckoutPrices":
          openCheckoutPrices();
          sendResponse({ success: true });
          break;
        case "openUrl": {
          const url = message?.url;
          if (!url) {
            sendResponse({ success: false, error: "missing_url" });
            break;
          }
          chrome.tabs.create({ url }, (tab) => {
            sendResponse({ success: true, tabId: tab?.id });
          });
          return true;
        }
        case "OPEN_OPTIONS": {
          openOptionsAsActionPopup()
            .then((opened) => {
              sendResponse({ success: opened });
            })
            .catch((error) => {
              log("OPEN_OPTIONS handler error", error);
              sendResponse({ success: false, error: String(error) });
            });
          return true;
        }
        case "hideControllerModal":
          sendToActiveTab({ action: "hideControllerModal" });
          sendResponse({ success: true });
          break;
        case "getActiveTab":
          // Get the currently active tab
          log("getActiveTab requested");
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              log("getActiveTab: found tab", tabs[0]);
              sendResponse({ tab: tabs[0] });
            } else {
              log("getActiveTab: no tabs found");
              sendResponse({ error: "No active tab found" });
            }
          });
          return true; // Keep message channel open for async response
        case "GET_TABS":
          // Get all tabs for CMDK palette
          chrome.tabs.query({}, (tabs) => {
            const tabInfo = tabs.map((tab) => ({
              id: tab.id,
              title: tab.title,
              url: tab.url,
              favIconUrl: tab.favIconUrl,
              active: tab.active,
              windowId: tab.windowId,
            }));
            sendResponse({ tabs: tabInfo });
          });
          return true; // Keep message channel open for async response
        case "SWITCH_TAB":
          // Switch to a specific tab
          const tabId = message.tabId;
          if (tabId) {
            chrome.tabs.update(tabId, { active: true }, (tab) => {
              if (tab) {
                chrome.windows.update(tab.windowId, { focused: true });
              }
              sendResponse({ success: true });
            });
          } else {
            sendResponse({ success: false, error: "No tabId provided" });
          }
          return true;
        case "GET_PREVIOUS_TAB":
          // Get the previous active tab ID
          sendResponse({ tabId: previousActiveTabId });
          break;
        case "OPEN_TAB":
          // Open a new tab with the given URL
          const newTabUrl = message.url;
          if (newTabUrl) {
            chrome.tabs.create({ url: newTabUrl }, (tab) => {
              sendResponse({ success: true, tabId: tab?.id });
            });
          } else {
            sendResponse({ success: false, error: "No URL provided" });
          }
          return true;
        case "FETCH_CSV_LINKS":
          // Fetch CSV data (bypasses CORS in content scripts)
          const csvUrl = message.url;
          if (csvUrl) {
            fetch(csvUrl)
              .then((response) => response.text())
              .then((data) => {
                sendResponse({ success: true, data });
              })
              .catch((error) => {
                log("CSV fetch error:", error);
                sendResponse({ success: false, error: error.message });
              });
          } else {
            sendResponse({ success: false, error: "No URL provided" });
          }
          return true; // Keep channel open for async response
        case "toggleDebug":
          DEBUG = !!message.value;
          chrome.storage.local.set({ debugLogs: DEBUG });
          log("DEBUG toggled", DEBUG);
          sendResponse({ success: true, debug: DEBUG });
          break;
        case "generateQr": {
          // Generate QR in SW to bypass page CSP (return as data URL)
          const text = message?.text || "";
          const size = Number(message?.size || 256);
          if (!text) {
            sendResponse({ success: false, error: "missing_text" });
            break;
          }
          const endpoint = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
            text
          )}`;
          fetch(endpoint)
            .then(async (r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const buf = await r.arrayBuffer();
              const base64 = arrayBufferToBase64(buf);
              const dataUrl = `data:image/png;base64,${base64}`;
              sendResponse({ success: true, dataUrl });
            })
            .catch((err) => {
              log("generateQr error", err?.message || err);
              sendResponse({
                success: false,
                error: String(err?.message || err),
              });
            });
          return true;
        }
        case "ping":
          log("pong");
          sendResponse({ pong: true, time: Date.now() });
          break;
        case "openQRScanner":
          openQRScanner();
          sendResponse({ success: true });
          break;
        case "openFloatingToolbar":
          openFloatingToolbar();
          sendResponse({ success: true });
          break;
        case "openPaytonSidepanel": {
          // Backward compat: treat as toggle for default tool
          toggleSidePanelForTab(sender?.tab?.id, "settings");
          sendResponse({ success: true });
          break;
        }
        case "toggleSidepanelTool": {
          const tool = message?.tool || "settings";
          toggleSidePanelForTab(sender?.tab?.id, tool);
          sendResponse({ success: true });
          break;
        }
        case "goBackToPOS":
          goBackToPOS();
          sendResponse({ success: true });
          break;
        case "qrCodeScanned":
          handleQRCodeScanned(message.data, message.timestamp);
          sendResponse({ success: true });
          break;
        case "closeQRScanner":
          // QR Scanner is now handled by web service, no local window to close
          sendResponse({ success: true });
          break;
        case "setStore": {
          const store = message?.store;
          const room = message?.room;
          if (store) {
            chrome.storage.local.set(
              {
                pmSelectedStore: store,
                pmStoreRoom:
                  room ||
                  (store === "Taylor" ? "taylor-store" : "southgate-store"),
              },
              () => {
                log("Store updated:", store, "Room:", room);
                // Broadcast store change to all tabs
                chrome.tabs.query({}, (tabs) => {
                  tabs.forEach((t) => {
                    try {
                      chrome.tabs.sendMessage(t.id, {
                        action: "pm-store-changed",
                        store: store,
                        room:
                          room ||
                          (store === "Taylor"
                            ? "taylor-store"
                            : "southgate-store"),
                      });
                    } catch (error) {
                      log("Suppressed error", error);
                    }
                  });
                });
              }
            );
            sendResponse({ success: true, store, room });
          } else {
            sendResponse({ success: false, error: "missing_store" });
          }
          break;
        }
        case "getStore": {
          chrome.storage.local.get(
            ["pmSelectedStore", "pmStoreRoom"],
            (result) => {
              sendResponse({
                success: true,
                store: result.pmSelectedStore || "",
                room: result.pmStoreRoom || "",
              });
            }
          );
          return true; // Keep message channel open for async response
        }
        case "checkSiteStatus": {
          const domain = message?.domain;
          if (!domain) {
            sendResponse({ success: false, error: "missing_domain" });
            break;
          }

          chrome.storage.local.get(
            { disabledSites: [], globalEnabled: true },
            (cfg) => {
              const isDisabled =
                !cfg.globalEnabled ||
                cfg.disabledSites.some((site) => {
                  // Simple domain matching (can be enhanced with wildcard support)
                  return domain === site || domain.endsWith("." + site);
                });

              sendResponse({
                success: true,
                disabled: isDisabled,
                globalEnabled: cfg.globalEnabled,
                disabledSites: cfg.disabledSites,
              });
            }
          );
          return true; // Keep message channel open for async response
        }
        case "updateDisabledSites": {
          const sites = message?.sites;
          if (!Array.isArray(sites)) {
            sendResponse({ success: false, error: "invalid_sites_array" });
            break;
          }

          chrome.storage.local.set({ disabledSites: sites }, () => {
            // Broadcast settings change to all tabs
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach((t) => {
                try {
                  chrome.tabs.sendMessage(t.id, {
                    action: "pm-settings-changed",
                    disabledSites: sites,
                  });
                } catch (error) {
                  log("Suppressed error", error);
                }
              });
            });

            sendResponse({ success: true });
          });
          return true; // Keep message channel open for async response
        }
        case "toggleCurrentSite": {
          const enabled = message?.enabled;
          const domain = message?.domain;

          if (typeof enabled !== "boolean" || !domain) {
            sendResponse({ success: false, error: "invalid_parameters" });
            break;
          }

          chrome.storage.local.get({ disabledSites: [] }, (cfg) => {
            let updatedSites;

            if (enabled) {
              // Remove domain from disabled list
              updatedSites = cfg.disabledSites.filter(
                (site) => site !== domain
              );
            } else {
              // Add domain to disabled list
              updatedSites = [...cfg.disabledSites, domain];
            }

            chrome.storage.local.set({ disabledSites: updatedSites }, () => {
              // Broadcast settings change to all tabs
              chrome.tabs.query({}, (tabs) => {
                tabs.forEach((t) => {
                  try {
                    chrome.tabs.sendMessage(t.id, {
                      action: "pm-settings-changed",
                      disabledSites: updatedSites,
                    });
                  } catch (error) {
                    log("Suppressed error", error);
                  }
                });
              });

              sendResponse({ success: true, disabledSites: updatedSites });
            });
          });
          return true; // Keep message channel open for async response
        }
        case "checkoutPricesDataUpdated": {
          log("Checkout prices data updated", message?.data);
          // Store the updated data and notify any listening components
          chrome.storage.local.set({
            checkoutPricesData: message?.data,
            checkoutPricesLastUpdated: Date.now(),
          });
          sendResponse({ success: true });
          break;
        }
        default:
          log("Unknown action", message?.action);
          sendResponse({ ok: false, error: "unknown_action" });
      }
      return true; // keep the message channel open if needed
    });

    // QR Scanner functionality - now handled by web service

    function openCheckoutPrices() {
      log("Opening Checkout Prices from web service");
      // Use sidebar instead of action popup
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const active = tabs && tabs[0];
        if (active?.id) {
          toggleSidePanelForTab(active.id, "checkout-prices");
        } else {
          log("openCheckoutPrices: no active tab id");
          // Fallback: try to get any tab and open there
          chrome.tabs.query({}, (allTabs) => {
            if (allTabs.length > 0) {
              toggleSidePanelForTab(allTabs[0].id, "checkout-prices");
            }
          });
        }
      });
    }

    function openControllerTest() {
      log("Opening Controller Test");
      // Use sidebar instead of action popup
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const active = tabs && tabs[0];
        if (active?.id) {
          toggleSidePanelForTab(active.id, "controller-testing");
        } else {
          log("openControllerTest: no active tab id");
        }
      });
    }

    function openFloatingToolbar() {
      log("Opening Floating Toolbar from web service");
      openInActionPopup("floating-toolbar");
    }

    function goBackToPOS() {
      log("Going back to POS tab");

      // Find the last tab with pos.paymore.tech URL
      chrome.tabs.query({}, (tabs) => {
        const posTabs = tabs.filter(
          (tab) => tab.url && tab.url.includes("pos.paymore.tech")
        );

        if (posTabs.length > 0) {
          // Sort by last accessed time (most recent first)
          const sortedTabs = posTabs.sort((a, b) => {
            const aTime = a.lastAccessed || 0;
            const bTime = b.lastAccessed || 0;
            return bTime - aTime;
          });

          const targetTab = sortedTabs[0];
          log("Found POS tab:", targetTab.id, targetTab.url);

          // Activate and focus the POS tab
          chrome.tabs.update(targetTab.id, { active: true });
          chrome.windows.update(targetTab.windowId, { focused: true });

          // Close the current toolbar tab
          chrome.tabs.query(
            { active: true, currentWindow: true },
            (activeTabs) => {
              if (activeTabs.length > 0) {
                chrome.tabs.remove(activeTabs[0].id);
              }
            }
          );
        } else {
          log("No POS tabs found, opening new one");
          // If no POS tab exists, open a new one
          chrome.tabs.create({
            url: "https://pos.paymore.tech",
            active: true,
          });
        }
      });
    }

    function openQRScanner(tabId) {
      log("Opening QR Scanner in side panel");
      const openFor = (id) => {
        try {
          // Enable and open immediately to satisfy user-gesture requirement
          try {
            chrome.sidePanel.setOptions({
              enabled: true,
              path: "sidepanel.html",
            });
          } catch (error) {
            log("Failed to normalize action popup URL", error);
          }
          try {
            chrome.sidePanel.open({ tabId: id }, () => {
              const err = chrome.runtime.lastError;
              if (err) {
                log("sidePanel open lastError", err.message);
              }
            });
          } catch (e) {
            log("sidePanel open error", e?.message || e);
          }
          // Update desired tool asynchronously (sidepanel listens to storage changes)
          try {
            chrome.storage.local.set({
              sidePanelTool: "qr-session",
              sidePanelUrl: null,
            });
          } catch (error) {
            log("Suppressed error", error);
          }
        } catch (e) {
          log("openQRScanner error", e?.message || e);
        }
      };
      const id = Number(tabId) || null;
      if (id) return openFor(id);
      // Fallback: resolve active tab then open
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const active = tabs && tabs[0];
          if (active?.id) openFor(active.id);
          else log("openQRScanner: no active tab id");
        });
      } catch (e) {
        log("openQRScanner fallback error", e?.message || e);
      }
    }

    function toggleSidePanelForTab(tabId, tool) {
      const desiredTool = tool || "controller-testing";

      const asValidTabId = (value) => {
        if (typeof value === "number" && Number.isInteger(value) && value >= 0)
          return value;
        if (typeof value === "string") {
          const parsed = Number(value);
          if (Number.isInteger(parsed) && parsed >= 0) return parsed;
        }
        return null;
      };

      try {
        const openForTab = (id) => {
          const prev = SIDE_PANEL_STATE.get(id) || { open: false, tool: null };

          if (prev.open && prev.tool === desiredTool) {
            try {
              chrome.sidePanel.close({ tabId: id });
              SIDE_PANEL_STATE.set(id, { open: false, tool: null });
              log(`Sidepanel closed for tool: ${desiredTool}`);
            } catch (closeErr) {
              log("sidePanel close error", closeErr?.message || closeErr);
            }
            return;
          }

          try {
            chrome.storage.local.set({
              sidePanelTool: desiredTool,
              sidePanelUrl: null,
            });
          } catch (storageErr) {
            log(
              "Failed to set chrome storage for tool:",
              storageErr?.message || storageErr
            );
          }

          try {
            const setPromise = chrome.sidePanel.setOptions({
              tabId: id,
              enabled: true,
              path: "sidepanel.html",
            });
            if (typeof setPromise?.catch === "function") {
              setPromise.catch((setErr) =>
                log("sidePanel setOptions error", setErr?.message || setErr)
              );
            }
          } catch (setErr) {
            log("sidePanel setOptions error", setErr?.message || setErr);
          }

          try {
            chrome.sidePanel.open({ tabId: id }, () => {
              const err = chrome.runtime.lastError;
              if (err) {
                log("sidePanel open lastError", err.message);
              } else {
                SIDE_PANEL_STATE.set(id, { open: true, tool: desiredTool });
                log(`Sidepanel opened for tool: ${desiredTool} on tab: ${id}`);
              }
            });
          } catch (openErr) {
            log("sidePanel open error", openErr?.message || openErr);
          }
        };

        const resolvedTabId =
          asValidTabId(tabId) ??
          asValidTabId(currentActiveTabId) ??
          asValidTabId(lastActiveTabId);

        if (resolvedTabId !== null) {
          openForTab(resolvedTabId);
          return;
        }

        log(
          "toggleSidePanelForTab: could not resolve tab id immediately; querying"
        );
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const active = tabs && tabs[0];
          const fallbackId = asValidTabId(active?.id);
          if (fallbackId !== null) {
            openForTab(fallbackId);
          } else {
            log(
              "toggleSidePanelForTab: unable to resolve active tab id for sidepanel"
            );
          }
        });
      } catch (e) {
        log("toggleSidePanelForTab error", e?.message || e);
      }
    }

    function handleQRCodeScanned(data, timestamp) {
      log("QR Code scanned", { data, timestamp });

      // Store the scanned data
      chrome.storage.local.set({
        lastScannedQR: { data, timestamp },
      });

      // Notify active tab about the scan
      sendToActiveTab({
        action: "qrCodeScanned",
        data: data,
        timestamp: timestamp,
      });
    }

    function arrayBufferToBase64(buffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      // btoa works with binary strings
      return btoa(binary);
    }

    function toolToPath(tool) {
      switch (tool) {
        case "checkout-prices":
          return "/tools/checkout-prices";
        case "controller-testing":
          return "/tools/controller-testing";
        case "price-charting":
          return "/tools/price-charting";
        case "upc-search":
          return "/tools/upc-search";
        case "scout":
          return "/tools/scout";
        case "settings":
          return "/tools/settings";
        case "qr-session":
          return "/tools/qr-session";
        case "floating-toolbar":
          return "/tools/floating-toolbar";
        case "help":
          return "/tools/help";
        case "min-reqs":
          return "/tools/min-reqs";
        case "shopify-search":
          return "/tools/shopify/search";
        case "shopify-storefront":
          return "/tools/shopify/storefront";
        case "ebay":
          return "/tools/ebay";
        case "links":
          return "/tools/links";

        case "paymore":
          return "/tools/paymore";
        default:
          return "/";
      }
    }

    function openInActionPopup(tool) {
      if (tool !== "controller-testing" && tool !== "settings") {
        log("Unsupported tool for action popup:", tool);
        return;
      }

      const internalPath =
        tool === "settings" ? "options.html" : "sidepanel.html";
      const resolvedUrl = chrome.runtime.getURL(internalPath);

      try {
        chrome.storage.local.set({ actionPopupUrl: resolvedUrl }, () => {
          try {
            chrome.action.openPopup(() => {
              const err = chrome.runtime.lastError;
              if (err) log("openPopup error", err.message);
            });
          } catch (error) {
            log("openPopup threw", error?.message || error);
          }
        });
      } catch (error) {
        log("Failed to open action popup", error?.message || error);
      }
    }

    let CURRENT_TOOL_POPUP_ID = null;
    let AUTOCLOSE_ON_BLUR = true;
    let FOCUS_LISTENER_ATTACHED = false;

    function ensureAutoCloseListener() {
      if (FOCUS_LISTENER_ATTACHED) return;
      try {
        chrome.windows.onFocusChanged.addListener((winId) => {
          try {
            if (!AUTOCLOSE_ON_BLUR) return;
            // If our popup is open and focus moved to another window (or to none), close it
            if (
              CURRENT_TOOL_POPUP_ID &&
              winId !== CURRENT_TOOL_POPUP_ID &&
              winId !== chrome.windows.WINDOW_ID_NONE
            ) {
              chrome.windows.remove(CURRENT_TOOL_POPUP_ID, () => {});
              CURRENT_TOOL_POPUP_ID = null;
            }
          } catch (error) {
            log("Suppressed error", error);
          }
        });
        chrome.windows.onRemoved.addListener((winId) => {
          if (winId === CURRENT_TOOL_POPUP_ID) CURRENT_TOOL_POPUP_ID = null;
        });
        FOCUS_LISTENER_ATTACHED = true;
      } catch (error) {
        log("Suppressed error", error);
      }
    }

    function openToolInCenteredWindow(tool, percent) {
      chrome.storage.local.get(
        {
          scannerBaseUrl: "https://paymore-extension.vercel.app",
          toolsPassword: "",
        },
        (cfg) => {
          const baseUrl = (cfg?.scannerBaseUrl || "").replace(/\/$/, "");
          const path = toolToPath(tool);
          let url = `${baseUrl}${path}${
            path.includes("?") ? "&" : "?"
          }pm_popup=1`;

          // Add password to all tool URLs if configured
          if (cfg?.toolsPassword) {
            try {
              const u = new URL(url);
              u.searchParams.set("password", cfg.toolsPassword);
              url = u.href;
            } catch (error) {
              url = `${url}${
                url.includes("?") ? "&" : "?"
              }password=${encodeURIComponent(cfg.toolsPassword)}`;
            }
          }

          try {
            chrome.system.display.getInfo((displays) => {
              // Use primary display workArea (excludes taskbars)
              const d = (displays && displays[0] && displays[0].workArea) || {
                left: 0,
                top: 0,
                width: 1280,
                height: 800,
              };
              const w = Math.max(500, Math.floor(d.width * (percent || 0.85)));
              const h = Math.max(400, Math.floor(d.height * (percent || 0.85)));
              const left = Math.max(0, d.left + Math.floor((d.width - w) / 2));
              const top = Math.max(0, d.top + Math.floor((d.height - h) / 2));
              chrome.windows.create(
                {
                  url,
                  type: "popup",
                  width: w,
                  height: h,
                  left,
                  top,
                  focused: true,
                },
                (win) => {
                  try {
                    CURRENT_TOOL_POPUP_ID = win?.id || null;
                    ensureAutoCloseListener();
                  } catch (error) {
                    log("Suppressed error", error);
                  }
                }
              );
            });
          } catch (e) {
            log("openToolInCenteredWindow error", e?.message || e);
            chrome.windows.create(
              { url, type: "popup", focused: true },
              (win) => {
                try {
                  CURRENT_TOOL_POPUP_ID = win?.id || null;
                  ensureAutoCloseListener();
                } catch (error) {
                  log("Suppressed error", error);
                }
              }
            );
          }
        }
      );
    }

    let CURRENT_ALERT_POPUP_ID = null;
    let LAST_ALERT_FINGERPRINT = null;
    let LAST_ALERT_AT = 0;
    function openAlertWindow(payload) {
      // Open a small chromeless popup pointed at the alert page with query params
      chrome.storage.local.get(
        {
          scannerBaseUrl: "https://paymore-extension.vercel.app",
          toolsPassword: "",
        },
        (cfg) => {
          const baseUrl = (cfg?.scannerBaseUrl || "").replace(/\/$/, "");
          try {
            // Dedup by fingerprint and cooldown
            const text = (payload?.text || "").toString();
            const user = (payload?.user || "").toString();
            const room = (payload?.room || "team").toString();
            const fp = `${room}|${user}|${text}`.slice(0, 512);
            const now = Date.now();
            if (LAST_ALERT_FINGERPRINT === fp && now - LAST_ALERT_AT < 5000) {
              log("suppressing duplicate alert within cooldown");
              return;
            }
            LAST_ALERT_FINGERPRINT = fp;
            LAST_ALERT_AT = now;
            const u = new URL(`${baseUrl}/tools/alert`);

            // Add password if configured
            if (cfg?.toolsPassword) {
              u.searchParams.set("password", cfg.toolsPassword);
            }

            if (text) u.searchParams.set("text", text);
            if (user) u.searchParams.set("user", user);
            if (room) u.searchParams.set("room", room);
            u.searchParams.set("pm_window", "1");
            u.searchParams.set("pm_w", "420");
            u.searchParams.set("pm_h", "220");
            const url = u.href;
            chrome.system.display.getInfo((displays) => {
              const d = (displays && displays[0] && displays[0].workArea) || {
                left: 0,
                top: 0,
                width: 1280,
                height: 800,
              };
              const w = 420;
              const h = 220;
              const left = Math.max(0, d.left + Math.floor((d.width - w) / 2));
              const top = Math.max(0, d.top + Math.floor((d.height - h) / 3));
              const createWindow = () =>
                chrome.windows.create(
                  {
                    url,
                    type: "popup",
                    width: w,
                    height: h,
                    left,
                    top,
                    focused: true,
                  },
                  (win) => {
                    CURRENT_ALERT_POPUP_ID = win?.id || null;
                    ensureAutoCloseListener();
                  }
                );
              if (CURRENT_ALERT_POPUP_ID) {
                try {
                  chrome.windows.update(
                    CURRENT_ALERT_POPUP_ID,
                    {
                      state: "normal",
                      width: w,
                      height: h,
                      left,
                      top,
                      focused: true,
                    },
                    (updated) => {
                      const err = chrome.runtime.lastError;
                      if (err || !updated) {
                        CURRENT_ALERT_POPUP_ID = null;
                        createWindow();
                      }
                    }
                  );
                } catch (error) {
                  CURRENT_ALERT_POPUP_ID = null;
                  createWindow();
                }
              } else {
                createWindow();
              }
            });
          } catch (e) {
            log("openAlertWindow error", e?.message || e);
          }
        }
      );
    }

    function openToolNear(tool, anchor, percent) {
      chrome.storage.local.get(
        {
          scannerBaseUrl: "https://paymore-extension.vercel.app",
          toolsPassword: "",
        },
        (cfg) => {
          const baseUrl = (cfg?.scannerBaseUrl || "").replace(/\/$/, "");
          const path = toolToPath(tool);
          let url = `${baseUrl}${path}${
            path.includes("?") ? "&" : "?"
          }pm_window=1`;

          // Add password to all tool URLs if configured
          if (cfg?.toolsPassword) {
            try {
              const u = new URL(url);
              u.searchParams.set("password", cfg.toolsPassword);
              url = u.href;
            } catch (error) {
              url = `${url}${
                url.includes("?") ? "&" : "?"
              }password=${encodeURIComponent(cfg.toolsPassword)}`;
            }
          }

          const ax = Math.max(0, Number(anchor?.x || 0));
          const ay = Math.max(0, Number(anchor?.y || 0));
          try {
            chrome.system.display.getInfo((displays) => {
              const d = (displays && displays[0] && displays[0].workArea) || {
                left: 0,
                top: 0,
                width: 1280,
                height: 800,
              };
              const w = Math.max(420, Math.floor(d.width * (percent || 0.35)));
              const h = Math.max(360, Math.floor(d.height * (percent || 0.35)));
              const gap = 16;
              const openLeft = ax > d.left + d.width * 0.5; // anchor on right half
              let left = openLeft
                ? Math.floor(ax - w - gap)
                : Math.floor(ax + gap);
              let top = Math.floor(ay - Math.floor(h / 2));
              left = Math.min(Math.max(d.left, left), d.left + d.width - w);
              top = Math.min(Math.max(d.top, top), d.top + d.height - h);
              // Reuse existing popup window when possible
              const createWindow = () =>
                chrome.windows.create(
                  {
                    url,
                    type: "popup",
                    state: "normal",
                    width: w,
                    height: h,
                    left,
                    top,
                    focused: true,
                  },
                  (win) => {
                    CURRENT_TOOL_POPUP_ID = win?.id || null;
                    ensureAutoCloseListener();
                  }
                );
              if (CURRENT_TOOL_POPUP_ID) {
                try {
                  chrome.windows.update(
                    CURRENT_TOOL_POPUP_ID,
                    {
                      state: "normal",
                      width: w,
                      height: h,
                      left,
                      top,
                      focused: true,
                    },
                    (updated) => {
                      const err = chrome.runtime.lastError;
                      if (err || !updated) {
                        CURRENT_TOOL_POPUP_ID = null;
                        createWindow();
                      }
                    }
                  );
                } catch (error) {
                  CURRENT_TOOL_POPUP_ID = null;
                  createWindow();
                }
              } else {
                createWindow();
              }
            });
          } catch (e) {
            log("openToolNear error", e?.message || e);
            chrome.windows.create(
              { url, type: "popup", focused: true },
              (win) => {
                try {
                  CURRENT_TOOL_POPUP_ID = win?.id || null;
                  ensureAutoCloseListener();
                } catch (error) {
                  log("Suppressed error", error);
                }
              }
            );
          }
        }
      );
    }

    function resizeFocusedPopup(width, height) {
      try {
        chrome.windows.getCurrent((win) => {
          if (!win || win.type !== "popup") return;
          const update = {};
          if (width && Number.isFinite(width)) update.width = Math.floor(width);
          if (height && Number.isFinite(height))
            update.height = Math.floor(height);
          if (Object.keys(update).length) chrome.windows.update(win.id, update);
        });
      } catch (e) {
        log("resizeFocusedPopup error", e?.message || e);
      }
    }
  },
});
