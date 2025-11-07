import { Dimensions } from 'react-native';

const window = Dimensions.get('window');

export const SCREEN_WIDTH = window.width;
export const WINDOW_HEIGHT = window.height;

// This will be updated with actual safe area insets in components
// For static calculations, we use window height
export const getContentHeight = (topInset: number, bottomInset: number): number => {
  return WINDOW_HEIGHT - topInset - bottomInset;
};

// Video feed items currently occupy full content height (without tab bar).
// Keep a separate helper for clarity so components can evolve independently.
export const getVideoFeedHeight = (topInset: number, bottomInset: number): number => {
  return WINDOW_HEIGHT - topInset - bottomInset;
};
