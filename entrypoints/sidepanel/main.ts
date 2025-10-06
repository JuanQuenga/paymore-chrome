// @ts-nocheck
/* global chrome */

/**
 * @fileoverview PayMore Chrome Extension Side Panel Script
 * @description Manages the side panel functionality and tool navigation
 * @version 1.0.0
 * @author PayMore Team
 * @license MIT
 *
 * This script handles:
 * - Initial tool setup in localStorage
 * - Settings button integration
 * - Tool header updates based on localStorage changes
 */
// Import Tailwind for sidepanel UI
import "../styles/tailwind.css";

/**
 * Utility function to query DOM elements
 * @param {string} s - CSS selector string
 * @returns {Element|null} First matching element or null
 */
const $ = (s) => document.querySelector(s);

/**
 * Converts a tool identifier to its display name
 * @param {string} tool - Tool identifier string
 * @returns {string} Human-readable tool name
 */
function toolToDisplayName(tool) {
  switch (tool) {
    case "calculator":
      return "Calculator";
    case "qr-session":
      return "Mobile Scanner";
    case "controller-testing":
      return "Controller Testing";
    case "checkout-prices":
      return "Checkout Prices";
    case "min-reqs":
      return "Minimum Requirements";
    case "price-charting":
      return "Price Charting";
    case "shopify-search":
      return "Shopify Inventory Search";
    case "shopify-storefront":
      return "Shopify Storefront";
    case "ebay":
      return "eBay Categories";
    case "paymore":
      return "PayMore";
    case "help":
      return "Help Center";
    case "settings":
      return "Settings";
    case "tutorials":
      return "Tutorials";
    case "store":
      return "Store";
    case "upc-search":
      return "UPC Search";
    case "links":
      return "Quick Links";
    case "top-offers":
      return "Top Offers";
    default:
      return "PayMore";
  }
}

/**
 * Initializes the side panel when DOM content is loaded
 * Sets up event listeners and loads initial configuration
 */
document.addEventListener("DOMContentLoaded", () => {
  // Load configuration and initialize the tools page
  chrome.storage.local.get(
    {
      scannerBaseUrl: "https://paymore-extension.vercel.app",
      toolsPassword: "",
      sidePanelTool: null,
    },
    (cfg) => {
      try {
        const baseUrl = (cfg.scannerBaseUrl || "").replace(/\/$/, "");
        let toolsUrl = `${baseUrl}/tools?pm_sp=1`;

        // Add password if configured
        if (cfg?.toolsPassword) {
          toolsUrl += `&password=${encodeURIComponent(cfg.toolsPassword)}`;
        }

        // Set the iframe src to load the tools page
        const frame = document.querySelector("#frame");
        if (frame) {
          frame.src = toolsUrl;

          // Send initial tool to iframe when it loads
          frame.onload = () => {
            try {
              const currentTool =
                localStorage.getItem("paymore-active-tool") || "paymore";
              if (frame.contentWindow) {
                frame.contentWindow.postMessage(
                  {
                    type: "paymore-tool-update",
                    tool: currentTool,
                    key: "paymore-active-tool",
                    value: currentTool,
                  },
                  "*"
                );
              }
            } catch (e) {
              console.error("Failed to send initial tool to iframe:", e);
            }
          };
        }

        // Set active tool from chrome storage (if provided) or initialize default
        try {
          const toolFromStorage = cfg.sidePanelTool;
          if (toolFromStorage) {
            localStorage.setItem("paymore-active-tool", toolFromStorage);
            // Clear the chrome storage since we've used it
            chrome.storage.local.remove(["sidePanelTool", "sidePanelUrl"]);
          } else {
            // Initialize default if not set
            const storedTool = localStorage.getItem("paymore-active-tool");
            if (!storedTool) {
              localStorage.setItem("paymore-active-tool", "paymore");
            }
          }
        } catch (e) {
          console.error("Failed to initialize active tool:", e);
        }
      } catch (e) {
        console.error("Failed to initialize sidepanel:", e);
        // Fallback: load default tools page
        try {
          const frame = document.querySelector("#frame");
          if (frame) {
            frame.src = "https://paymore-extension.vercel.app/tools?pm_sp=1";
          }
        } catch (e2) {
          console.error("Fallback also failed:", e2);
        }
      }
    }
  );

  // Settings button - open settings tool
  try {
    const settingsBtn = document.querySelector("#btn-settings");
    settingsBtn?.addEventListener("click", () => {
      try {
        // Set settings as active tool
        localStorage.setItem("paymore-active-tool", "settings");
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(
          new CustomEvent("paymore-tool-change", {
            detail: { key: "paymore-active-tool", value: "settings" },
          })
        );

        // Send message to iframe to update its localStorage
        const frame = document.querySelector("#frame");
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage(
            {
              type: "paymore-tool-update",
              tool: "settings",
              key: "paymore-active-tool",
              value: "settings",
            },
            "*"
          );
        }

        updateToolHeader();
      } catch (e) {
        console.error("Failed to open settings:", e);
      }
    });
  } catch (e) {
    console.error("Failed to set up settings button:", e);
  }

  // Listen for localStorage changes to update tool header
  const updateToolHeader = () => {
    try {
      const activeTool =
        localStorage.getItem("paymore-active-tool") || "paymore";
      const toolHeader = document.querySelector("#current-tool");
      if (toolHeader) {
        toolHeader.textContent = toolToDisplayName(activeTool);
      }
    } catch (e) {
      console.error("Failed to update tool header:", e);
    }
  };

  // Initial header update
  updateToolHeader();

  // Listen for localStorage changes (cross-tab)
  window.addEventListener("storage", (e) => {
    if (e.key === "paymore-active-tool") {
      updateToolHeader();
    }
  });

  // Listen for custom events (same-tab)
  window.addEventListener("paymore-tool-change", (e) => {
    if (e.detail?.key === "paymore-active-tool") {
      updateToolHeader();
    }
  });

  // Listen for chrome storage changes to update localStorage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.sidePanelTool && changes.sidePanelTool.newValue) {
      try {
        const tool = changes.sidePanelTool.newValue;
        localStorage.setItem("paymore-active-tool", tool);
        // Dispatch custom event to notify the iframe
        window.dispatchEvent(
          new CustomEvent("paymore-tool-change", {
            detail: { key: "paymore-active-tool", value: tool },
          })
        );

        // Send message to iframe to update its localStorage
        const frame = document.querySelector("#frame");
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage(
            {
              type: "paymore-tool-update",
              tool: tool,
              key: "paymore-active-tool",
              value: tool,
            },
            "*"
          );
        }

        updateToolHeader();
        // Clear the chrome storage since we've used it
        chrome.storage.local.remove(["sidePanelTool", "sidePanelUrl"]);
      } catch (e) {
        console.error("Failed to update tool from chrome storage:", e);
      }
    }
  });
});

// The tools page will handle its own communication with the content script
