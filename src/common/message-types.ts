/**
 * Consolidated message type constants for Chrome extension communication
 */

export enum MessageTarget {
  Offscreen = "offscreen",
  ContentScript = "content_script",
  Background = "background",
}

export const BACKGROUND_MESSAGE_TYPES = {
  GET_STORAGE_STATS: "get_storage_stats",
  CLEAR_ALL_DATA: "clear_all_data",
} as const;

export const OFFSCREEN_MESSAGE_TYPES = {
  // No offscreen message types needed
} as const;

export type BackgroundMessageType =
  (typeof BACKGROUND_MESSAGE_TYPES)[keyof typeof BACKGROUND_MESSAGE_TYPES];
export type OffscreenMessageType =
  (typeof OFFSCREEN_MESSAGE_TYPES)[keyof typeof OFFSCREEN_MESSAGE_TYPES];
