// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* global window, document */

import { defineContentScript } from "wxt/utils/define-content-script";

/**
 * Adds an inline summary to eBay sold listing search result pages showing
 * average, median, high, and low sale prices for the visible results.
 *
 * This script ONLY runs on eBay search pages (https://www.ebay.com/sch/*).
 * It will only display the summary when the LH_Sold=1 parameter is present.
 */
export default defineContentScript({
  matches: ["https://www.ebay.com/sch/*"],
  runAt: "document_idle",
  allFrames: false,
  main() {
    // Early safety check: ensure we're on an eBay search page
    if (!window.location.hostname.includes("ebay.com") ||
        !window.location.pathname.startsWith("/sch/")) {
      console.log("💙 [Paymore eBay Sold Summary] Not on eBay search page, exiting");
      return;
    }

    console.log("💙 [Paymore eBay Sold Summary] SCRIPT LOADED - Version 2");

    const SUMMARY_ID = "paymore-ebay-sold-summary";
    const STYLE_ID = "paymore-ebay-sold-summary-style";
    let updateQueued = false;
    let isDismissed = false;

    const log = (...args: any[]) => {
      try {
        console.log("[Paymore eBay Sold Summary]", ...args);
      } catch {}
    };

    const ensureStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${SUMMARY_ID} {
          width: 100%;
          border: 1px solid #22c55e;
          background: rgba(34, 197, 94, 0.08);
          padding: 14px 18px;
          border-radius: 10px;
          margin: 12px 0 0 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
          color: #0f172a;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
          position: relative;
        }
        #${SUMMARY_ID} h2 {
          font-size: 17px;
          margin: 0 0 10px;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        #${SUMMARY_ID} h2 img {
          width: 20px;
          height: 20px;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric {
          min-width: 120px;
          background: rgba(255, 255, 255, 0.6);
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.4);
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric--clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric--clickable:hover {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric--clickable:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric strong {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric-button {
          min-width: 120px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(21, 128, 61, 0.95));
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(34, 197, 94, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          color: white;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(21, 128, 61, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric-button:hover {
          background: linear-gradient(135deg, rgba(21, 128, 61, 1), rgba(20, 83, 45, 1));
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(21, 128, 61, 0.35);
          border-color: rgba(20, 83, 45, 0.8);
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(21, 128, 61, 0.3);
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric-button[disabled] {
          background: rgba(148, 163, 184, 0.3);
          color: rgba(71, 85, 105, 0.6);
          cursor: not-allowed;
          opacity: 0.5;
          pointer-events: none;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__metric-button[disabled]:hover {
          transform: none;
          box-shadow: none;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__dismiss {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(148, 163, 184, 0.2);
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 6px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 1;
          color: #475569;
          transition: all 0.2s ease;
          z-index: 10;
          pointer-events: auto;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__dismiss:hover {
          background: rgba(239, 68, 68, 0.9);
          border-color: rgba(220, 38, 38, 0.8);
          color: white;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__settings {
          position: absolute;
          top: 10px;
          right: 46px;
          background: rgba(148, 163, 184, 0.2);
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 6px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          color: #475569;
          transition: all 0.2s ease;
          z-index: 10;
          pointer-events: auto;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__settings:hover {
          background: rgba(34, 197, 94, 0.9);
          border-color: rgba(21, 128, 61, 0.8);
          color: white;
        }
        #${SUMMARY_ID} .paymore-ebay-summary__meta {
          margin-top: 12px;
          font-size: 12px;
          color: #475569;
        }
        .paymore-listing-highlight {
          animation: paymore-highlight-pulse 1s ease-in-out;
          outline: 3px solid rgba(34, 197, 94, 0.8) !important;
          outline-offset: 4px;
          border-radius: 8px !important;
          background: rgba(34, 197, 94, 0.05) !important;
        }
        @keyframes paymore-highlight-pulse {
          0%, 100% {
            outline-color: rgba(34, 197, 94, 0.8);
            outline-width: 3px;
          }
          50% {
            outline-color: rgba(21, 128, 61, 1);
            outline-width: 5px;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const isSoldResultsPage = () => {
      try {
        const url = new URL(window.location.href);
        if (!/\.ebay\./i.test(url.hostname)) return false;
        if (!url.pathname.startsWith("/sch/")) return false;
        const soldParam = url.searchParams.get("LH_Sold");
        return soldParam === "1" || soldParam === "true";
      } catch {
        return false;
      }
    };

    const parsePrice = (text: string) => {
      if (!text) return null;
      let cleaned = text
        .replace(/\(.*?\)/g, "")
        .replace(/Approximately\s+/i, "")
        .replace(/About\s+/i, "")
        .trim();

      const rangeSplit = cleaned.split(/\bto\b|-/i);
      if (rangeSplit.length > 1) {
        cleaned = rangeSplit[0];
      }

      const match = cleaned.match(/[\d,.]+/);
      if (!match) return null;
      const numeric = parseFloat(match[0].replace(/,/g, ""));
      if (!Number.isFinite(numeric)) return null;
      return numeric;
    };

    const detectCurrencyPrefix = (text: string) => {
      if (!text) return "$";
      const prefix = text
        .replace(/[\d.,]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (prefix) return prefix;
      const symbolMatch = text.match(/[$\u00a3\u00a5\u20ac]/);
      if (symbolMatch) return symbolMatch[0];
      return "$";
    };

    const formatCurrency = (value: number, prefix: string) => {
      const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${prefix ? prefix + " " : ""}${formatted}`.trim();
    };

    const parseSoldDate = (element: Element) => {
      try {
        // Look for the "Sold" date text
        const soldDateElement =
          element.querySelector(".su-styled-text.positive") ||
          element.querySelector(".s-item__title--tagblock .POSITIVE") ||
          element.querySelector(".s-item__ended-date");

        if (!soldDateElement) return null;

        const text = soldDateElement.textContent?.trim();
        if (!text) return null;

        // Extract date from text like "Sold  Jan 15, 2025" or "Sold Jan 15, 2025"
        const match = text.match(/Sold\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
        if (!match) return null;

        const dateStr = match[1];
        const date = new Date(dateStr);

        if (isNaN(date.getTime())) return null;

        return date;
      } catch {
        return null;
      }
    };

    const collectPrices = () => {
      // Find the main search results container
      const mainResultsContainer =
        document.querySelector("ul.srp-results.srp-grid") ||
        document.querySelector("#srp-river-results");

      if (!mainResultsContainer) {
        log("⚠️ Could not find main results container");
        return {
          prices: [],
          currencyPrefix: "$",
          mostRecentDate: null,
          minElement: null,
          maxElement: null,
          mostRecentElement: null,
        };
      }

      log("✓ Found main results container");

      // Get ALL direct child <li> elements
      const allListItems = Array.from(mainResultsContainer.children).filter(
        (child) => child.tagName === "LI"
      );

      log("Found", allListItems.length, "total <li> elements");

      // Collect only product listings BEFORE the "fewer words" divider
      const productListings = [];

      for (let i = 0; i < allListItems.length; i++) {
        const item = allListItems[i];

        // Check if this is a product listing (has data-listingid)
        if (item.hasAttribute("data-listingid")) {
          productListings.push(item);
          continue;
        }

        // This is NOT a product listing - check if it's the "fewer words" divider
        const classList = item.className || "";
        const textContent = item.textContent || "";

        if (
          classList.includes("srp-river-answer--REWRITE_START") ||
          textContent.includes("Results matching fewer words")
        ) {
          log("🛑 STOP: Found 'fewer words' divider at index", i);
          log(
            "   - Collected",
            productListings.length,
            "products before divider"
          );
          break; // STOP - everything after this is suggested
        }

        // Other divider/notice - skip and continue
        log("Skipping divider/notice at index", i);
      }

      log("✅ Final count:", productListings.length, "product listings");

      // Extract prices and dates with element tracking
      const priceData: Array<{
        value: number;
        element: Element;
        date: Date | null;
      }> = [];
      let currencyPrefix: string | null = null;

      for (const item of productListings) {
        const priceElement =
          item.querySelector(".s-card__price") ||
          item.querySelector(".s-item__price") ||
          item.querySelector("[data-test-id='ITEM-PRICE']");

        if (!priceElement) continue;

        const text = priceElement.textContent?.trim();
        if (!text) continue;

        const value = parsePrice(text);
        if (value === null) continue;

        if (!currencyPrefix) {
          currencyPrefix = detectCurrencyPrefix(text);
        }

        // Try to get the sold date
        const soldDate = parseSoldDate(item);

        priceData.push({ value, element: item, date: soldDate });
      }

      log("💰 Extracted", priceData.length, "prices");

      if (priceData.length === 0) {
        return {
          prices: [],
          currencyPrefix: currencyPrefix || "$",
          mostRecentDate: null,
          minElement: null,
          maxElement: null,
          mostRecentElement: null,
        };
      }

      // Find min and max elements
      const minEntry = priceData.reduce((min, curr) =>
        curr.value < min.value ? curr : min
      );
      const maxEntry = priceData.reduce((max, curr) =>
        curr.value > max.value ? curr : max
      );

      // Find the most recent date entry
      const entriesWithDates = priceData.filter((entry) => entry.date !== null);
      let mostRecentEntry = null;
      let mostRecentDate = null;

      if (entriesWithDates.length > 0) {
        mostRecentEntry = entriesWithDates.reduce((latest, current) =>
          current.date! > latest.date! ? current : latest
        );
        mostRecentDate = mostRecentEntry.date;
      }

      const prices = priceData.map((d) => d.value);
      log("📅 Found", entriesWithDates.length, "dates");

      return {
        prices,
        currencyPrefix: currencyPrefix || "$",
        mostRecentDate,
        minElement: minEntry.element,
        maxElement: maxEntry.element,
        mostRecentElement: mostRecentEntry?.element || null,
      };
    };

    const removeSummary = () => {
      const existing = document.getElementById(SUMMARY_ID);
      if (existing) {
        existing.remove();
      }
    };

    const ensureSummaryContainer = () => {
      let container = document.getElementById(SUMMARY_ID);
      if (container) {
        log("✓ Summary container already exists");
        return container;
      }

      // Try to find the srp-controls__row-2 element
      const srpControlsRow2 = document.querySelector(".srp-controls__row-2");
      log(
        "Searching for .srp-controls__row-2:",
        srpControlsRow2 ? "FOUND" : "NOT FOUND"
      );

      if (srpControlsRow2) {
        container = document.createElement("section");
        container.id = SUMMARY_ID;
        // Insert the summary as the last child of srp-controls__row-2
        srpControlsRow2.appendChild(container);
        log("✓ Summary container inserted into .srp-controls__row-2");
        return container;
      }

      // Fallback to old behavior if the element is not found
      const river = document.getElementById("srp-river-results");
      log(
        "Fallback: Searching for #srp-river-results:",
        river ? "FOUND" : "NOT FOUND"
      );

      if (!river || !river.parentElement) {
        log("✗ Cannot insert summary - no suitable parent found");
        return null;
      }

      container = document.createElement("section");
      container.id = SUMMARY_ID;
      river.parentElement.insertBefore(container, river);
      log("✓ Summary container inserted before #srp-river-results (fallback)");
      return container;
    };

    const renderSummary = async () => {
      updateQueued = false;
      log("=== renderSummary called ===");

      // Check if the feature is enabled in settings
      try {
        const result = await chrome.storage.sync.get(["cmdkSettings"]);
        const isEnabled = result.cmdkSettings?.ebaySummary?.enabled ?? true;

        if (!isEnabled) {
          log("✗ eBay Summary feature is disabled in settings");
          removeSummary();
          return;
        }
      } catch (err) {
        log("⚠️ Failed to check settings, assuming enabled", err);
      }

      const isSold = isSoldResultsPage();
      log("Is sold results page?", isSold);

      if (!isSold) {
        removeSummary();
        return;
      }

      // Check if user has dismissed this summary
      if (isDismissed) {
        log("✗ Summary was dismissed by user, not showing");
        removeSummary();
        return;
      }

      const {
        prices,
        currencyPrefix,
        mostRecentDate,
        minElement,
        maxElement,
        mostRecentElement,
      } = collectPrices();
      log("Collected prices:", prices.length, "prices found");

      if (!prices.length) {
        log("✗ No prices found, removing summary");
        removeSummary();
        return;
      }

      ensureStyles();
      const container = ensureSummaryContainer();
      if (!container) {
        log("✗ Could not create/find container");
        return;
      }

      const sorted = [...prices].sort((a, b) => a - b);
      const count = prices.length;
      const total = prices.reduce((sum, value) => sum + value, 0);
      const average = total / count;
      const median =
        count % 2 === 1
          ? sorted[(count - 1) / 2]
          : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      // Format the most recent date
      let formattedDate = "N/A";
      if (mostRecentDate) {
        const options: Intl.DateTimeFormatOptions = {
          month: "short",
          day: "numeric",
          year: "numeric",
        };
        formattedDate = mostRecentDate.toLocaleDateString("en-US", options);
      }

      // Check current item condition to disable the appropriate button
      const url = new URL(window.location.href);
      const currentCondition = url.searchParams.get("LH_ItemCondition");
      const isOnUsedPage = currentCondition === "4";
      const isOnNewPage = currentCondition === "3";

      // Get the Paymore brand icon URL
      const iconUrl = chrome.runtime.getURL("assets/images/brand.png");

      container.innerHTML = `
        <button type="button" class="paymore-ebay-summary__settings" title="Settings" data-action="settings">⚙</button>
        <button type="button" class="paymore-ebay-summary__dismiss" title="Dismiss" data-action="dismiss">×</button>
        <h2><img src="${iconUrl}" alt="Paymore" /> Paymore Price Summary</h2>
        <div class="paymore-ebay-summary__metrics">
          <div class="paymore-ebay-summary__metric">
            <strong>Average</strong>
            <span>${formatCurrency(average, currencyPrefix)}</span>
          </div>
          <div class="paymore-ebay-summary__metric">
            <strong>Median</strong>
            <span>${formatCurrency(median, currencyPrefix)}</span>
          </div>
          <div class="paymore-ebay-summary__metric paymore-ebay-summary__metric--clickable" data-scroll-to="highest" title="Click to scroll to listing">
            <strong>Highest</strong>
            <span>${formatCurrency(max, currencyPrefix)}</span>
          </div>
          <div class="paymore-ebay-summary__metric paymore-ebay-summary__metric--clickable" data-scroll-to="lowest" title="Click to scroll to listing">
            <strong>Lowest</strong>
            <span>${formatCurrency(min, currencyPrefix)}</span>
          </div>
          <div class="paymore-ebay-summary__metric">
            <strong>Listings</strong>
            <span>${count}</span>
          </div>
          <div class="paymore-ebay-summary__metric paymore-ebay-summary__metric--clickable" data-scroll-to="latest" title="Click to scroll to listing">
            <strong>Last Sold</strong>
            <span>${formattedDate}</span>
          </div>
          <div class="paymore-ebay-summary__metric-button" data-action="view-used" ${
            isOnUsedPage ? "disabled" : ""
          }>
            View Used
          </div>
          <div class="paymore-ebay-summary__metric-button" data-action="view-new" ${
            isOnNewPage ? "disabled" : ""
          }>
            View New
          </div>
        </div>
        <div class="paymore-ebay-summary__meta">
          Based on ${count} sold listings detected on this page. Apply filters or refresh to recalculate.
        </div>
      `;

      // Add click handlers for buttons
      const settingsBtn = container.querySelector('[data-action="settings"]');
      const dismissBtn = container.querySelector('[data-action="dismiss"]');
      const usedBtn = container.querySelector('[data-action="view-used"]');
      const newBtn = container.querySelector('[data-action="view-new"]');

      if (settingsBtn) {
        settingsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          log("Settings button clicked");
          // Open settings page and navigate to eBay section
          chrome.runtime.sendMessage({
            action: "open-settings",
            section: "ebay",
          });
        });
      }

      if (dismissBtn) {
        dismissBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          log("Dismiss button clicked");
          isDismissed = true;
          removeSummary();
        });
      }

      if (usedBtn) {
        usedBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = new URL(window.location.href);
          url.searchParams.set("LH_ItemCondition", "4");
          window.location.href = url.toString();
        });
      }

      if (newBtn) {
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = new URL(window.location.href);
          url.searchParams.set("LH_ItemCondition", "3");
          window.location.href = url.toString();
        });
      }

      // Add scroll-to handlers for clickable metrics
      const scrollToAndHighlight = (
        element: Element | null,
        metricName: string
      ) => {
        if (!element) {
          log(`⚠️ No element found for ${metricName}`);
          return;
        }

        // Remove any existing highlights
        document.querySelectorAll(".paymore-listing-highlight").forEach((el) => {
          el.classList.remove("paymore-listing-highlight");
        });

        // Scroll to the element with smooth behavior
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add highlight class
        element.classList.add("paymore-listing-highlight");

        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.classList.remove("paymore-listing-highlight");
        }, 3000);

        log(`✓ Scrolled to and highlighted ${metricName}`);
      };

      const highestMetric = container.querySelector(
        '[data-scroll-to="highest"]'
      );
      const lowestMetric = container.querySelector('[data-scroll-to="lowest"]');
      const latestMetric = container.querySelector('[data-scroll-to="latest"]');

      if (highestMetric) {
        highestMetric.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          scrollToAndHighlight(maxElement, "highest price listing");
        });
      }

      if (lowestMetric) {
        lowestMetric.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          scrollToAndHighlight(minElement, "lowest price listing");
        });
      }

      if (latestMetric) {
        latestMetric.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          scrollToAndHighlight(mostRecentElement, "most recent listing");
        });
      }
    };

    const scheduleUpdate = () => {
      if (updateQueued) return;
      updateQueued = true;
      try {
        window.requestAnimationFrame(renderSummary);
      } catch {
        setTimeout(renderSummary, 150);
      }
    };

    const start = () => {
      log("=== Paymore eBay Sold Summary Starting ===");
      log("Current URL:", window.location.href);
      log("Is eBay search page:", window.location.pathname.startsWith("/sch/"));
      log("Is sold results page:", isSoldResultsPage());

      if (!document.body) {
        log("Body not ready, retrying...");
        setTimeout(start, 100);
        return;
      }

      // Listen for settings changes from the settings page
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "ebay-summary-settings-changed") {
          log("Received settings change message:", message);
          // Don't reset dismiss flag when settings change
          scheduleUpdate();
        }
      });

      // Hook into history changes for SPA-like navigation
      ["pushState", "replaceState"].forEach((method) => {
        try {
          const original = (history as any)[method];
          if (typeof original !== "function") return;
          (history as any)[method] = function (...args: any[]) {
            const result = original.apply(this, args);
            // Reset dismiss flag when URL changes (new search)
            isDismissed = false;
            scheduleUpdate();
            return result;
          };
        } catch (err) {
          log(`Failed to wrap history.${method}`, err);
        }
      });

      window.addEventListener("popstate", () => {
        // Reset dismiss flag when navigating back/forward
        isDismissed = false;
        scheduleUpdate();
      });

      // Initial render - wait a bit for eBay's dynamic content to load
      setTimeout(() => {
        scheduleUpdate();
      }, 500);
    };

    start();
  },
});
