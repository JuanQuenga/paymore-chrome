import { defineConfig, type WxtViteConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // Use the official Tailwind v4 Vite plugin for class scanning + HMR.
  vite: () => ({ plugins: [tailwindcss()] } as WxtViteConfig),
  outDir: ".output", // Base output directory
  outDirTemplate: "paymore-chrome", // Custom output directory name (removes browser/manifest folder nesting)
  contentScripts: [
    {
      matches: ["<all_urls>"],
      entries: ["content", "toolbar-mount"],
    },
    {
      matches: ["*://pos.paymore.tech/inventory*"],
      entries: ["content-pos-inventory"],
    },
  ],
  manifest: {
    name: "Paymore",
    version: "1.0.9",
    description: "Chrome extension for Paymore Employees.",
    permissions: [
      "storage",
      "tabs",
      "activeTab",
      "scripting",
      "sidePanel",
      "system.display",
      // Needed for adding right-click context menu actions
      "contextMenus",
      // Needed for CMDK bookmarks and history
      "bookmarks",
      "history",
    ],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "assets/icons/icon16.png",
      32: "assets/icons/icon32.png",
      48: "assets/icons/icon48.png",
      128: "assets/icons/icon128.png",
    },
    action: {
      default_icon: "assets/images/brand.png",
      default_popup: "popup.html",
    },
    side_panel: {
      default_path: "sidepanel.html",
    },
    options_page: "options.html",
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "Open Command Popup",
      },
      "open-options": {
        suggested_key: {
          default: "Ctrl+Shift+O",
          mac: "Command+Shift+O",
        },
        description: "Open extension options",
      },
      "toggle-toolbar": {
        suggested_key: {
          default: "Ctrl+Shift+L",
          mac: "Command+Shift+L",
        },
        description: "Dismiss/show toolbar",
      },
      "open-toolbar-sidepanel": {
        suggested_key: {
          default: "Ctrl+Shift+T",
          mac: "Command+Shift+T",
        },
        description: "Open toolbar sidepanel",
      },
    },
    // Expose toolbar and assets to content scripts
    web_accessible_resources: [
      {
        resources: [
          "components/floating-appbar/toolbar.html",
          "assets/images/*",
        ],
        matches: ["<all_urls>"],
      },
    ],
  },
} as any);
