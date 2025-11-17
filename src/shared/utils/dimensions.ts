import { Dimensions } from "react-native";

const window = Dimensions.get("window");

export const SCREEN_WIDTH = window.width;
export const WINDOW_HEIGHT = window.height;

// This will be updated with actual safe area insets in components
// For static calculations, we use window height
export const getContentHeight = (
  topInset: number,
  bottomInset: number
): number => {
  return WINDOW_HEIGHT - topInset;
};

// Video feed items should account for tab bar height
// Keep a separate helper for clarity so components can evolve independently.
const TAB_BAR_HEIGHT = 75; // Tab bar height (adjusted to prevent over-cropping)

export const getVideoFeedHeight = (
  topInset: number,
  bottomInset: number
): number => {
  return WINDOW_HEIGHT - topInset - bottomInset - TAB_BAR_HEIGHT;
};
