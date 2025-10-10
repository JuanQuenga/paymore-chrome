export interface CSVLink {
  id: string;
  title: string;
  url: string;
  category?: string;
  description?: string;
}

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSCj4wc4-d9BJO03Asa0FiHm3vYY2MOW7XcmKXM42kdBEoaCDxQNoqaIYBl5PSO_deooc1VnYl18bVo/pub?gid=9974464&single=true&output=csv";

/**
 * Basic CSV row parser that supports quoted fields and commas inside quotes
 */
function parseCsvRow(row: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote
        if (row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ",") {
        out.push(current.trim());
        current = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }
  out.push(current.trim());
  return out;
}

/**
 * Parse CSV text into array of objects.
 * Handles both multi-line CSV and single-line flattened exports from Google Sheets.
 * Detects header to map columns in the order: Category, Name, URL, Description.
 */
function parseCSV(csvText: string): CSVLink[] {
  const text = (csvText || "").trim();
  if (!text) return [];

  // Normalize newlines
  const normalized = text.replace(/\r\n?/g, "\n");

  // Build rows with strict 4-column schema: Category, Name, URL, Description
  const rows: string[][] = [];
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    for (const line of lines) rows.push(line.split(",").map((v) => v.trim()));
  } else {
    const tokens = normalized.split(",").map((v) => v.trim());
    for (let i = 0; i < tokens.length; i += 4)
      rows.push(tokens.slice(i, i + 4));
  }

  if (!rows.length) return [];

  // Detect header by first row tokens
  const header = rows[0].map((v) => v.toLowerCase());
  const hasHeader =
    header[0] === "category" &&
    (header[1] === "name" || header[1] === "title") &&
    header[2] === "url";

  const startIndex = hasHeader ? 1 : 0;
  const links: CSVLink[] = [];
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    // Pad to 4 columns
    const category = (row[0] || "General").trim();
    const title = (row[1] || `Link ${i}`).trim();
    const url = (row[2] || "").trim();
    const description = (row[3] || "").trim();
    if (url.startsWith("http")) {
      links.push({ id: `csv-link-${i}`, title, url, category, description });
    }
  }
  return links;
}

const CACHE_KEY = "csvLinksCache";
const CACHE_TIMESTAMP_KEY = "csvLinksCacheTimestamp";
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

/**
 * Fetch CSV links from Google Sheets with caching
 * Returns an object with links and a flag indicating if this is initial load
 */
export async function fetchCSVLinks(): Promise<{ links: CSVLink[]; isInitialLoad: boolean }> {
  try {
    // Try to get cached data first
    const result = await getCachedLinks();
    if (result.cached) {
      console.log("[CSV] Using cached links:", result.cached.length);
      // Return cached data immediately, but refresh in background if expired
      if (result.isExpired) {
        console.log("[CSV] Cache expired, refreshing in background");
        refreshLinksInBackground();
      }
      return { links: result.cached, isInitialLoad: false };
    }

    // No cache, fetch fresh data - this is initial load
    console.log("[CSV] No cache found, fetching fresh data");
    const links = await fetchFreshLinks();
    return { links, isInitialLoad: true };
  } catch (error) {
    console.error("[CSV] Failed to fetch CSV links:", error);
    return { links: [], isInitialLoad: false };
  }
}

/**
 * Get cached links if they exist
 * Returns cached links and whether they are expired
 */
async function getCachedLinks(): Promise<{ cached: CSVLink[] | null; isExpired: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [CACHE_KEY, CACHE_TIMESTAMP_KEY],
      (result) => {
        if (chrome.runtime.lastError) {
          resolve({ cached: null, isExpired: false });
          return;
        }

        const cachedLinks = result[CACHE_KEY];
        const timestamp = result[CACHE_TIMESTAMP_KEY];

        if (!cachedLinks || !timestamp) {
          resolve({ cached: null, isExpired: false });
          return;
        }

        // Check if cache is still valid
        const now = Date.now();
        const age = now - timestamp;

        if (age > CACHE_DURATION) {
          console.log("[CSV] Cache expired, but returning cached data");
          // Return cached data but mark as expired so it refreshes in background
          resolve({ cached: cachedLinks, isExpired: true });
          return;
        }

        resolve({ cached: cachedLinks, isExpired: false });
      }
    );
  });
}

/**
 * Fetch fresh links and update cache
 */
async function fetchFreshLinks(): Promise<CSVLink[]> {
  try {
    // Try direct fetch first (works in popup context)
    try {
      const response = await fetch(CSV_URL);
      if (response.ok) {
        const data = await response.text();
        console.log("[CSV] Fetched data:", data.substring(0, 200)); // Debug
        const links = parseCSV(data);
        console.log("[CSV] Parsed links:", links); // Debug

        // Cache the results
        await cacheLinks(links);
        return links;
      }
    } catch (fetchError) {
      console.log(
        "[CSV] Direct fetch failed, trying background script:",
        fetchError
      );
    }

    // Fallback: Use background script to fetch (for content script context)
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "FETCH_CSV_LINKS", url: CSV_URL },
        async (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[CSV] Error fetching via background:",
              chrome.runtime.lastError
            );
            resolve([]);
            return;
          }

          if (response?.success && response?.data) {
            const links = parseCSV(response.data);
            console.log("[CSV] Parsed links from background:", links); // Debug

            // Cache the results
            await cacheLinks(links);
            resolve(links);
          } else {
            console.log("[CSV] No data from background:", response);
            resolve([]);
          }
        }
      );
    });
  } catch (error) {
    console.error("[CSV] Failed to fetch fresh links:", error);
    return [];
  }
}

/**
 * Cache links in chrome.storage.local
 */
async function cacheLinks(links: CSVLink[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [CACHE_KEY]: links,
        [CACHE_TIMESTAMP_KEY]: Date.now(),
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("[CSV] Failed to cache links:", chrome.runtime.lastError);
        } else {
          console.log("[CSV] Links cached successfully");
        }
        resolve();
      }
    );
  });
}

/**
 * Refresh links in the background without waiting
 */
function refreshLinksInBackground(): void {
  // Fire and forget - don't await
  fetchFreshLinks().catch((error) => {
    console.error("[CSV] Background refresh failed:", error);
  });
}

/**
 * Filter CSV links by search query
 */
export function filterCSVLinks(links: CSVLink[], query: string): CSVLink[] {
  if (!query.trim()) return links;

  const lowerQuery = query.toLowerCase();
  return links.filter((link) => {
    const title = link.title?.toLowerCase() || "";
    const category = link.category?.toLowerCase() || "";
    const description = link.description?.toLowerCase() || "";
    const url = link.url?.toLowerCase() || "";

    return (
      title.includes(lowerQuery) ||
      category.includes(lowerQuery) ||
      description.includes(lowerQuery) ||
      url.includes(lowerQuery)
    );
  });
}
