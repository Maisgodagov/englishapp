import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  OnBandwidthUpdateData,
  OnLoadData,
  OnProgressData,
} from "react-native-video";

import { addVideoDataUsage } from "./videoDataUsageStore";

interface TrackerOptions {
  enabled: boolean;
  contentId: string;
}

type NullableBitrate = number | null | undefined;

const pickBitrate = (bitrate: NullableBitrate, fallback: number) => {
  if (typeof bitrate === "number" && Number.isFinite(bitrate) && bitrate > 0) {
    return bitrate;
  }
  return fallback;
};

interface VideoDataUsageHandlers {
  handleLoad: (data: OnLoadData) => void;
  handleProgress: (data: OnProgressData) => void;
  handleBandwidthUpdate: (data: OnBandwidthUpdateData) => void;
}

export const useVideoDataUsageTracker = ({
  enabled,
  contentId,
}: TrackerOptions): VideoDataUsageHandlers => {
  const statsRef = useRef({
    lastBufferedSeconds: 0,
    videoBitrate: 0,
    audioBitrate: 0,
  });

  useEffect(() => {
    statsRef.current = {
      lastBufferedSeconds: 0,
      videoBitrate: 0,
      audioBitrate: 0,
    };
  }, [contentId]);

  useEffect(() => {
    if (!enabled) {
      statsRef.current.lastBufferedSeconds = 0;
    }
  }, [enabled, contentId]);

  const accumulate = useCallback(
    (bufferedSeconds?: number) => {
      if (!enabled) {
        return;
      }

      if (
        bufferedSeconds === undefined ||
        Number.isNaN(bufferedSeconds) ||
        !Number.isFinite(bufferedSeconds)
      ) {
        return;
      }

      const safeBuffered = Math.max(bufferedSeconds, 0);
      const previous = statsRef.current.lastBufferedSeconds;

      if (safeBuffered < previous) {
        statsRef.current.lastBufferedSeconds = safeBuffered;
        return;
      }

      const deltaSeconds = safeBuffered - previous;
      if (deltaSeconds <= 0) {
        return;
      }

      const combinedBitrate =
        Math.max(statsRef.current.videoBitrate, 0) +
        Math.max(statsRef.current.audioBitrate, 0);

      if (combinedBitrate <= 0) {
        statsRef.current.lastBufferedSeconds = safeBuffered;
        return;
      }

      const bytes = (deltaSeconds * combinedBitrate) / 8;
      addVideoDataUsage(bytes);
      statsRef.current.lastBufferedSeconds = safeBuffered;
    },
    [enabled]
  );

  const handleLoad = useCallback(
    (data: OnLoadData) => {
      if (!enabled) {
        return;
      }

      const selectedVideo =
        data.videoTracks?.find((track) => track.selected) ??
        data.videoTracks?.[0];
      const selectedAudio =
        data.audioTracks?.find((track) => track.selected) ??
        data.audioTracks?.[0];

      statsRef.current.videoBitrate = pickBitrate(
        selectedVideo?.bitrate,
        statsRef.current.videoBitrate
      );
      statsRef.current.audioBitrate = pickBitrate(
        selectedAudio?.bitrate,
        statsRef.current.audioBitrate
      );
      statsRef.current.lastBufferedSeconds = Math.max(
        data.currentTime ?? 0,
        statsRef.current.lastBufferedSeconds
      );


    },
    [enabled]
  );

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      if (!enabled) {
        return;
      }

      const candidate = Math.max(
        data.playableDuration ?? 0,
        data.currentTime ?? 0,
        statsRef.current.lastBufferedSeconds
      );

      const previous = statsRef.current.lastBufferedSeconds;

      accumulate(candidate);
    },
    [accumulate, enabled]
  );

  const handleBandwidthUpdate = useCallback(
    (data: OnBandwidthUpdateData) => {
      if (!enabled) {
        return;
      }

      const oldBitrate = statsRef.current.videoBitrate;
      statsRef.current.videoBitrate = pickBitrate(
        data.bitrate,
        statsRef.current.videoBitrate
      );

    },
    [enabled]
  );

  // CRITICAL: Memoize the returned object to prevent recreating it on every render
  // This prevents all components using these handlers from re-creating their useCallback dependencies
  return useMemo(
    () => ({
      handleLoad,
      handleProgress,
      handleBandwidthUpdate,
    }),
    [handleLoad, handleProgress, handleBandwidthUpdate]
  );
};
