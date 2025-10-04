# Paymore Chrome Extension Releases

Download the latest and previous versions of the Paymore Chrome Extension.

## Latest Release

### v1.0.6 (Current)

**Release Date:** October 04, 2025
**Download:** [paymore-chrome-v1.0.6.zip](./paymore-chrome-v1.0.6.zip)

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
**Download:** [paymore-chrome-v1.0.5.zip](./paymore-chrome-v1.0.5.zip)

**What's New:**

- Patch release: minor fixes and dependency updates
- Updated package version to v1.0.5

### v1.0.4

**Release Date:** October 03, 2025
**Download:** [paymore-chrome-v1.0.4.zip](./paymore-chrome-v1.0.4.zip)

**What's New:**

- Bug fixes and stability improvements
- Minor UI tweaks

### v1.0.0

**Release Date:** October 03, 2025
**Download:** [paymore-chrome-v1.0.0.zip](./paymore-chrome-v1.0.0.zip)

**What's New:**

- Stable release
- All core features implemented
- Bug fixes and performance improvements

## Installation Instructions

1. Download `paymore-chrome-v1.0.6.zip`
2. Extract the ZIP file to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked"
6. Navigate to the extracted folder and select the `chrome-mv3/` folder
7. The extension will be installed and ready to use

### For Chrome Web Store Submission

The packed version is located at `.output/paymore-chrome-v1.0.6-packed.zip` and is ready for Chrome Web Store upload via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

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
- For the latest features and bug fixes, use the current release (v1.0.6)
- CMDK requires `bookmarks` and `history` permissions (granted on install)
- Quick Links are cached for 30 minutes in Chrome storage
- If you encounter issues, check the [CMDK_README.md](../CMDK_README.md) for troubleshooting

## Changelog Summary

**v1.0.6** - CMDK Command Palette, Keyboard Shortcuts, Bookmarks/History Integration
**v1.0.5** - Patch release with minor fixes
**v1.0.4** - Bug fixes and stability improvements
**v1.0.0** - Stable release with all core features

For questions or support, contact support@paymore.com
