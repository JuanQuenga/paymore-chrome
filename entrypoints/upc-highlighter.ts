// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* global chrome */

import { defineContentScript } from "wxt/utils/define-content-script";

/**
 * UPC Code Highlighter Content Script for Paymore
 *
 * Detects 12-digit UPC codes on web pages, highlights them, and enables
 * click-to-copy functionality. Respects the user preference stored in
 * `cmdkSettings.upcHighlighter.enabled`.
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: true,
  main() {
    const log = (...args) => {
      try {
        console.log("[Paymore UPC Highlighter]", ...args);
      } catch (_) {}
    };

    const UPC_REGEX = /\b(\d{12})\b/g;

    const HIGHLIGHT_CSS = `
      .paymore-upc-highlight {
        background-color: rgba(37, 99, 235, 0.15);
        border-bottom: 2px dotted #2563eb;
        cursor: pointer;
        padding: 1px 2px;
        border-radius: 2px;
        transition: all 0.2s ease;
        position: relative;
      }

      .paymore-upc-highlight:hover {
        background-color: rgba(37, 99, 235, 0.25);
        border-bottom-style: solid;
      }

      .paymore-upc-copied {
        background-color: rgba(16, 185, 129, 0.2) !important;
        border-bottom-color: #10b981 !important;
      }

      .paymore-upc-tooltip {
        position: fixed;
        background-color: #111827;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 2147483647;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .paymore-upc-tooltip.show {
        opacity: 1;
      }
    `;

    const injectStyles = () => {
      if (!document.getElementById("paymore-upc-highlighter-styles")) {
        const styleElement = document.createElement("style");
        styleElement.textContent = HIGHLIGHT_CSS;
        styleElement.id = "paymore-upc-highlighter-styles";
        (document.head || document.documentElement).appendChild(styleElement);
      }
    };

    const showTooltip = (element, text) => {
      document.querySelectorAll(".paymore-upc-tooltip").forEach((tooltip) => {
        tooltip.remove();
      });

      const tooltip = document.createElement("div");
      tooltip.className = "paymore-upc-tooltip";
      tooltip.textContent = text;

      document.body.appendChild(tooltip);

      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let top = rect.top - tooltipRect.height - 8;

      if (left < 5) left = 5;
      if (left + tooltipRect.width > window.innerWidth - 5) {
        left = window.innerWidth - tooltipRect.width - 5;
      }
      if (top < 5) {
        top = rect.bottom + 8;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;

      setTimeout(() => {
        tooltip.classList.add("show");
      }, 10);

      setTimeout(() => {
        tooltip.classList.remove("show");
        setTimeout(() => {
          tooltip.remove();
        }, 200);
      }, 2000);
    };

    const copyUPCToClipboard = async (upcCode, element) => {
      try {
        await navigator.clipboard.writeText(upcCode);
        element.classList.add("paymore-upc-copied");
        showTooltip(element, "UPC copied!");

        setTimeout(() => {
          element.classList.remove("paymore-upc-copied");
        }, 2000);

        log("UPC code copied to clipboard:", upcCode);
      } catch (err) {
        log("Failed to copy UPC code:", err);
        showTooltip(element, "Failed to copy");
      }
    };

    const highlightUPCsInTextNode = (textNode) => {
      const text = textNode.textContent;
      if (!text || !UPC_REGEX.test(text)) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      UPC_REGEX.lastIndex = 0;

      while ((match = UPC_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index))
          );
        }

        const upcElement = document.createElement("span");
        const upcCode = match[0];
        upcElement.className = "paymore-upc-highlight";
        upcElement.textContent = upcCode;
        upcElement.setAttribute("data-upc", upcCode);
        upcElement.title = `Click to copy UPC: ${upcCode}`;

        upcElement.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const upc = e.currentTarget.getAttribute("data-upc");
          copyUPCToClipboard(upc, upcElement);
        });

        upcElement.addEventListener("mouseenter", () => {
          if (!upcElement.classList.contains("paymore-upc-copied")) {
            showTooltip(upcElement, "Click to copy UPC");
          }
        });

        fragment.appendChild(upcElement);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex))
        );
      }

      if (fragment.childNodes.length > 0) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    };

    const processElement = (element) => {
      if (
        element.nodeType === Node.ELEMENT_NODE &&
        (element.tagName === "SCRIPT" ||
          element.tagName === "STYLE" ||
          element.tagName === "NOSCRIPT" ||
          element.classList.contains("paymore-upc-highlight"))
      ) {
        return;
      }

      if (element.nodeType === Node.TEXT_NODE) {
        highlightUPCsInTextNode(element);
        return;
      }

      if (element.childNodes) {
        Array.from(element.childNodes).forEach(processElement);
      }
    };

    const scanAndHighlightUPCs = () => {
      if (document.body) {
        processElement(document.body);
      }
    };

    const setupMutationObserver = () => {
      const observer = new MutationObserver((mutations) => {
        const shouldRescan = mutations.some((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            return true;
          }

          if (mutation.type === "characterData") {
            return true;
          }

          return false;
        });

        if (shouldRescan) {
          setTimeout(scanAndHighlightUPCs, 100);
        }
      });

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }

      return observer;
    };

    const checkSettingsEnabled = (callback) => {
      try {
        chrome.storage.sync.get(["cmdkSettings"], (result) => {
          if (chrome.runtime.lastError) {
            log("Error checking settings:", chrome.runtime.lastError);
            callback(true);
            return;
          }

          const settings = result.cmdkSettings;
          const enabled = settings?.upcHighlighter?.enabled ?? true;
          callback(enabled);
        });
      } catch (e) {
        log("Failed to check settings:", e);
        callback(true);
      }
    };

    const initializeUPCHighlighter = () => {
      checkSettingsEnabled((enabled) => {
        if (!enabled) {
          log("UPC highlighting is disabled in settings");
          return;
        }

        if (window === window.top) {
          log("Initializing UPC highlighter");
        }

        injectStyles();

        setTimeout(scanAndHighlightUPCs, 500);

        const observer = setupMutationObserver();

        try {
          chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
              if (message.action === "upc-highlighter-settings-changed") {
                const newEnabled = message.enabled ?? true;

                if (!newEnabled) {
                  document
                    .querySelectorAll(".paymore-upc-highlight")
                    .forEach((element) => {
                      const parent = element.parentNode;
                      if (parent) {
                        parent.replaceChild(
                          document.createTextNode(element.textContent),
                          element
                        );
                      }
                    });

                  const styleElement = document.getElementById(
                    "paymore-upc-highlighter-styles"
                  );
                  if (styleElement) {
                    styleElement.remove();
                  }

                  if (observer) {
                    observer.disconnect();
                  }

                  log("UPC highlighting disabled");
                } else {
                  log("UPC highlighting re-enabled, reloading page");
                  location.reload();
                }
              }

              return true;
            }
          );
        } catch (e) {
          log("Failed to set up message listener:", e);
        }
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeUPCHighlighter);
    } else {
      initializeUPCHighlighter();
    }
  },
});

