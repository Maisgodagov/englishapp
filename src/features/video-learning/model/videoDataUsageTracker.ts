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
    console.log(`[DataUsageTracker] 🆕 New content: ${contentId.slice(0, 8)}, resetting stats`);
    statsRef.current = {
      lastBufferedSeconds: 0,
      videoBitrate: 0,
      audioBitrate: 0,
    };
  }, [contentId]);

  useEffect(() => {
    if (!enabled) {
      console.log(`[DataUsageTracker] ⏸️ Tracking disabled for ${contentId.slice(0, 8)}`);
      statsRef.current.lastBufferedSeconds = 0;
    } else {
      console.log(`[DataUsageTracker] ▶️ Tracking enabled for ${contentId.slice(0, 8)}`);
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
      console.log(`[DataUsageTracker] 📊 Accumulated: ${(bytes / 1024).toFixed(1)} KB (total now: ${((bytes + (statsRef.current.lastBufferedSeconds * combinedBitrate / 8)) / (1024 * 1024)).toFixed(2)} MB)`);
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

      const totalBitrateKbps = Math.floor((statsRef.current.videoBitrate + statsRef.current.audioBitrate) / 1000);
      const estimatedMBPerMinute = (totalBitrateKbps * 60) / (8 * 1024);

      console.log(`[DataUsage ${contentId.slice(0, 8)}] 🎥 Source loaded`, {
        availableVideoTracks: data.videoTracks?.length ?? 0,
        availableAudioTracks: data.audioTracks?.length ?? 0,
        selectedVideoBitrateKbps: Math.floor(statsRef.current.videoBitrate / 1000),
        selectedAudioBitrateKbps: Math.floor(statsRef.current.audioBitrate / 1000),
        totalBitrateKbps,
        estimatedMBPerMinute: estimatedMBPerMinute.toFixed(2),
      });
    },
    [contentId, enabled]
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
      const candidateFloor = Math.floor(candidate);
      if (
        candidateFloor % 3 === 0 &&
        candidateFloor !== Math.floor(previous)
      ) {
        const combinedBitrate =
          Math.max(statsRef.current.videoBitrate, 0) +
          Math.max(statsRef.current.audioBitrate, 0);
        const deltaSeconds = candidate - previous;
        const deltaBytes = (deltaSeconds * combinedBitrate) / 8;

        const totalKbps = Math.floor((statsRef.current.videoBitrate + statsRef.current.audioBitrate) / 1000);
        console.log(`[DataUsage ${contentId.slice(0, 8)}] 📦 Buffer update`, {
          bufferedSeconds: Math.floor(candidate),
          currentTime: Math.floor(data.currentTime ?? 0),
          playableDuration: Math.floor(data.playableDuration ?? 0),
          videoBitrateKbps: Math.floor(statsRef.current.videoBitrate / 1000),
          audioBitrateKbps: Math.floor(statsRef.current.audioBitrate / 1000),
          totalKbps,
          deltaSeconds: deltaSeconds.toFixed(1),
          deltaKiloBytes: Math.floor(deltaBytes / 1024),
          bufferAheadSeconds: Math.floor(candidate - (data.currentTime ?? 0)),
        });
      }

      accumulate(candidate);
    },
    [accumulate, contentId, enabled]
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

      const qualityChange = statsRef.current.videoBitrate > oldBitrate ? '⬆️ UPGRADED' : '⬇️ DOWNGRADED';
      console.log(`[DataUsage ${contentId.slice(0, 8)}] 🔄 Bandwidth update ${qualityChange}`, {
        oldBitrateKbps: Math.floor(oldBitrate / 1000),
        newBitrateKbps: Math.floor(statsRef.current.videoBitrate / 1000),
        resolution: data.width && data.height ? `${data.width}x${data.height}` : 'unknown',
        trackId: data.trackId ?? null,
        changePercent: oldBitrate > 0 ? `${(((statsRef.current.videoBitrate - oldBitrate) / oldBitrate) * 100).toFixed(1)}%` : 'N/A',
      });
    },
    [contentId, enabled]
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
