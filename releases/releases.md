# Paymore Chrome Extension Releases

Download the latest and previous versions of the Paymore Chrome Extension.

## Latest Release

### v1.0.15 (Current)

**Release Date:** October 16, 2025
**Download:** [paymore-1.0.15-chrome.zip](./paymore-1.0.15-chrome.zip)

**What's New:**

### Features

- **Quick Actions Context Menu** - Small stability improvements to context menu interactions

### Improvements

- **Context Menu Stability** - Improved handling around native context menu pass-through on Windows when modifier keys are used

### Bug Fixes

- Fixed native context menu closing immediately on Windows when holding `Alt` after right-click
- Added `Ctrl+Right-Click` as an alternative to show the native context menu without interference
- Implemented a short Windows-only suppression window to ignore duplicate/follow-up `contextmenu` events that could close the native menu

---

### v1.0.14 (Previous)

**Release Date:** October 10, 2025
**Download:** [paymore-1.0.14-chrome.zip](./paymore-1.0.14-chrome.zip)

**What's New:**

### Features

- **UPC Highlighter** - Automatically detects 12-digit UPC codes on web pages and makes them clickable to copy to clipboard
- **eBay Price Summary** - Shows average, median, high, and low sale prices for eBay sold listings with clickable metrics and quick filters
- **Quick Actions Context Menu** - Enhanced right-click menu with quick actions including Copy, Paste, Open in New Tab, and Save As

### Improvements

- **Click-to-Copy UPC Codes** - Any highlighted UPC code can be clicked to instantly copy to clipboard
- **eBay Price Analytics** - Price statistics display at the top of eBay search results with dismissible per-session controls
- **Enhanced Context Menu** - PayMore Quick Actions section with streamlined workflow tools

### Bug Fixes

- Improved UPC code detection accuracy and highlighting
- Better integration between content scripts and extension settings
- Fixed content script temporal dead zone errors by hoisting initialization for `applyEnabledToolbarTools` and `enabledToolbarToolsCache`
- Restored eBay Price Summary by correcting initialization order and guarding toolbar DOM availability before applying user preferences

---

## Previous Releases

### v1.0.13

**Release Date:** October 10, 2025
**Download:** [paymore-1.0.13-chrome.zip](./paymore-1.0.13-chrome.zip)

**What's New:**

### Features

- **New Context Menu Action**: Added "Search for MPN on Google" to right-click search options

### Improvements

- Expanded context menu search capabilities with MPN (Manufacturer Part Number) lookup

---

### v1.0.12

**Release Date:** October 10, 2025
**Download:** [paymore-1.0.12-chrome.zip](./paymore-1.0.12-chrome.zip)

**What's New:**

### Features

- **Enhanced Context Menu Options**: Added three new right-click search options for selected text:
  - Search on UPCItemDB
  - Search for UPC on Google
  - Search on PriceCharting
- **Package Name Simplification**: Renamed package from "paymore-chrome" to "paymore"

### Improvements

- **Smarter CSV Caching**: Quick Links now return cached data immediately even if expired, then refresh in background for seamless UX
- **Improved Loading States**: Loading skeleton only shows on true initial load (no cache), not on cache refresh
- **Build Output Restructure**: Build outputs to `.output/` directory, zip files automatically moved to `releases/` folder
- **Cleaner Context Menu Titles**: Simplified right-click menu item labels for better readability

### Bug Fixes

- Fixed cache expiration logic to prevent unnecessary loading states when cached data is available

---

### v1.0.11

**Release Date:** October 07, 2025
**Download:** [paymore-1.0.11-chrome.zip](./paymore-1.0.11-chrome.zip)

**What's New:**

### Features

- Version bump and maintenance release

### Improvements

- Updated version numbers across configuration files

### Bug Fixes

- General maintenance and stability improvements

---

### v1.0.10

**Release Date:** October 06, 2025
**Download:** [paymore-1.0.10-chrome.zip](./paymore-1.0.10-chrome.zip)

**What's New:**

### Bug Fixes

- Fixed UPC Item Database search URL format (from `/search?q={query}` to `/upc/{query}`)

---

### v1.0.9

**Release Date:** October 06, 2025
**Download:** [paymore-1.0.9-chrome.zip](./paymore-1.0.9-chrome.zip)

**What's New:**

### Features

- **Release Script Integration**: Added `pnpm release <version>` command to package.json for streamlined release process
- **Automated Version Management**: Release script now handles version bumping across all configuration files
- **Build Optimization**: Improved release workflow with automatic zip generation for both GitHub and Chrome Web Store
- **UI Improvements**: Popup now fills entire window space, dismiss button is smaller and slides up on hover

### Improvements

- **Toolbar Dismiss Animation**: Dismiss button now slides up from toolbar on hover with smooth transitions
- **Popup Layout**: Full-window responsive layout with proper flexbox structure
- **Settings Interface**: Cleaner deployment URL input without placeholder text
- **Keyboard Shortcuts**: Streamlined shortcut system with toolbar sidepanel access

### Bug Fixes

- Fixed dismiss button hover detection across entire toolbar area
- Corrected popup window sizing to utilize full available space
- Improved toolbar button spacing and visual hierarchy

### Installation

1. Download [paymore-1.0.9-chrome.zip](./paymore-1.0.9-chrome.zip)
2. Unzip the file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the unzipped `paymore` folder

---

## Previous Releases

### v1.0.8

**Release Date:** October 04, 2025
**Download:** [paymore-1.0.8-chrome.zip](./paymore-1.0.8-chrome.zip)

**What's New:**

### Features

- **Search Provider Switching**: When a search provider is active in CMDK, all available search providers are now displayed in the list, making it easy to switch between them
- **Active Provider Indicator**: The currently active search provider shows a green "Active" badge
- **Quick Links Reverse Sort**: Categories now display in reverse alphabetical order (Warranty first, then Z→A) while links within categories remain alphabetically sorted

### Improvements

- **Backspace to Exit Search**: Press Backspace when the search query is empty to deactivate the current search provider
- **Keyboard Shortcut Update**: Changed toolbar toggle shortcut from `CMD+Shift+H` to `CMD+Shift+L` (Mac) / `CTRL+Shift+H` to `CTRL+Shift+L` (Windows/Linux)
- **Build Output Optimization**: Simplified build output directory structure to `.output/paymore-chrome/{files}` (removed nested `chrome-mv3` folder)
- **Settings Button Fix**: Corrected settings toolbar button to properly open options popup using the action API
- **Updated Tooltips**: Toolbar buttons now show keyboard shortcuts in tooltips (Dismiss: ⌘⇧L, Settings: ⌘⇧O)

### Bug Fixes

- Fixed CMDK settings tool handler to use correct message format (`action` instead of `type`)
- Removed duplicate settings button from toolbar scroll area
- Corrected build configuration to prevent double-nested output directories

### Installation

1. Download [paymore-1.0.8-chrome.zip](./paymore-1.0.8-chrome.zip)
2. Unzip the file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the unzipped `paymore` folder

---

## Previous Releases

### v1.0.7

**Release Date:** October 04, 2025
**Download:** [paymore-1.0.7-chrome.zip](./paymore-1.0.7-chrome.zip)

**What's New:**

### Features

- Version bump and maintenance release

### Improvements

- Updated version numbers across configuration files

### Bug Fixes

- General maintenance and stability improvements

### Installation

1. Download [paymore-1.0.7-chrome.zip](./paymore-1.0.7-chrome.zip)
2. Unzip the file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the unzipped `paymore` folder

### v1.0.6

**Release Date:** October 04, 2025
**Download:** [paymore-1.0.6-chrome.zip](./paymore-1.0.6-chrome.zip)

**What's New:**

**🎉 CMDK Command Palette (Major Feature)**

- Arc-style command palette accessible via `CMD+Shift+K` / `CTRL+Shift+K`
- Quick Links from Google Sheets with 30-minute caching
- Tab switching with search and filter
- Bookmarks integration (20 most recent)
- Recent browsing history (last 30 pages)
- 10 search providers: PayMore, Google, Amazon, Best Buy, eBay, Price Charting, UPC Item DB, YouTube, GitHub, Twitter/X
- All toolbar tools accessible via CMDK
- Smart arrow key navigation with "return to previous tab" feature
- Green accent theme throughout
- Loading skeletons for smooth UX
- Improved empty states with helpful messages

**⌨️ Keyboard Shortcuts**

- `CMD+Shift+K` / `CTRL+Shift+K` - Open CMDK popup
- `CMD+Shift+T` / `CTRL+Shift+T` - Toggle toolbar visibility with slide animation
- `CMD+Shift+O` / `CTRL+Shift+O` - Open extension options

**🎨 UI/UX Improvements**

- CMDK now opens as extension popup (no CSS conflicts)
- Toolbar slide-in/slide-out animations restored
- Green accent colors across all components
- Better empty state messaging
- Skeleton loading for Quick Links

**🔧 Technical Improvements**

- CSV links cached in Chrome storage (instant load after first fetch)
- Background refresh for Quick Links
- Bookmarks and history permissions added
- Display order: Quick Links → Tabs → Tools → Bookmarks → History
- Warranty category always appears first in Quick Links
- eBay search uses sold listings URL from context menu

**📚 Documentation**

- Updated CMDK_README.md with complete feature documentation
- Deleted implementation plan (merged into README)
- Added usage examples and troubleshooting guide

## Previous Releases

### v1.0.5

**Release Date:** October 03, 2025
**Download:** [paymore-1.0.5-chrome.zip](./paymore-1.0.5-chrome.zip)

**What's New:**

- Patch release: minor fixes and dependency updates
- Updated package version to v1.0.5

### v1.0.4

**Release Date:** October 03, 2025
**Download:** [paymore-1.0.4-chrome.zip](./paymore-1.0.4-chrome.zip)

**What's New:**

- Bug fixes and stability improvements
- Minor UI tweaks

### v1.0.0

**Release Date:** October 03, 2025
**Download:** [paymore-1.0.0-chrome.zip](./paymore-1.0.0-chrome.zip)

**What's New:**

- Stable release
- All core features implemented
- Bug fixes and performance improvements

## Installation Instructions

1. Download `paymore-1.0.14-chrome.zip`
2. Extract the ZIP file to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked"
6. Navigate to the extracted folder and select the `paymore` folder
7. The extension will be installed and ready to use

### For Chrome Web Store Submission

The packed version is ready for Chrome Web Store upload via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

## Keyboard Shortcuts Setup

After installation, you can customize keyboard shortcuts:

1. Go to `chrome://extensions/shortcuts`
2. Find "Paymore" extension
3. Customize shortcuts for:
   - Open CMDK popup (default: `CMD+Shift+K`)
   - Toggle toolbar visibility (default: `CMD+Shift+T`)
   - Open extension options (default: `CMD+Shift+O`)

## Notes

- Always download from official releases to ensure security
- For the latest features and bug fixes, use the current release (v1.0.14)
- CMDK requires `bookmarks` and `history` permissions (granted on install)
- Quick Links are cached for 30 minutes in Chrome storage
- If you encounter issues, check the [CMDK_README.md](../docs/CMDK_README.md) for troubleshooting

## Changelog Summary

**v1.0.14** - UPC Highlighter with click-to-copy, eBay Price Summary analytics, and Quick Actions context menu
**v1.0.13** - Added MPN search context menu action
**v1.0.12** - Enhanced context menu options, smarter CSV caching, package name simplification
**v1.0.11** - Version bump and maintenance release
**v1.0.10** - Bug fix for UPC Item Database search URL format
**v1.0.9** - Release script integration, UI improvements, and deployment URL privacy
**v1.0.8** - Search provider switching, active provider indicators, and toolbar improvements
**v1.0.7** - Version bump and maintenance release
**v1.0.6** - CMDK Command Palette, Keyboard Shortcuts, Bookmarks/History Integration
**v1.0.5** - Patch release with minor fixes
**v1.0.4** - Bug fixes and stability improvements
**v1.0.0** - Stable release with all core features

For questions or support, contact support@paymore.com
