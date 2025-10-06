declare const chrome: any;

// Offscreen: minimal placeholder listener kept to
// avoid breaking code that may send messages to the offscreen target.

console.log("Offscreen: placeholder loaded");

chrome.runtime.onMessage.addListener(
  (message: any, _sender: any, sendResponse: any) => {
    sendResponse({ success: false, error: "offscreen_placeholder" });
    return true;
  }
);
