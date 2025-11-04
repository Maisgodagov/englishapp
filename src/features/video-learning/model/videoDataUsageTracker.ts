import { useEffect, useRef } from "react";
import type { VideoPlayer } from "expo-video";

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

export const useVideoDataUsageTracker = (
  player: VideoPlayer | null,
  { enabled, contentId }: TrackerOptions
) => {
  const statsRef = useRef({
    lastBufferedSeconds: 0,
    videoBitrate: 0,
    audioBitrate: 0,
  });

  // Reset per content
  useEffect(() => {
    statsRef.current = {
      lastBufferedSeconds: 0,
      videoBitrate: 0,
      audioBitrate: 0,
    };
  }, [contentId]);

  // Reset when tracking disabled
  useEffect(() => {
    if (!enabled) {
      statsRef.current.lastBufferedSeconds = 0;
    }
  }, [enabled]);

  useEffect(() => {
    if (!player || !enabled) {
      return;
    }

    const stats = statsRef.current;

    const accumulate = (bufferedSeconds: number | undefined) => {
      if (!Number.isFinite(bufferedSeconds) || bufferedSeconds === undefined) {
        return;
      }

      const safeBuffered = Math.max(bufferedSeconds, 0);
      const previous = stats.lastBufferedSeconds;

      if (safeBuffered < previous) {
        // Buffer was flushed (seek backwards). Reset baseline.
        stats.lastBufferedSeconds = safeBuffered;
        return;
      }

      const deltaSeconds = safeBuffered - previous;
      if (deltaSeconds <= 0) {
        return;
      }

      const combinedBitrate =
        Math.max(stats.videoBitrate, 0) + Math.max(stats.audioBitrate, 0);
      if (combinedBitrate <= 0) {
        stats.lastBufferedSeconds = safeBuffered;
        return;
      }

      const bytes = (deltaSeconds * combinedBitrate) / 8;
      addVideoDataUsage(bytes);
      stats.lastBufferedSeconds = safeBuffered;
    };

    const handleTimeUpdate = ({
      bufferedPosition,
      currentTime,
    }: {
      bufferedPosition?: number;
      currentTime?: number;
    }) => {
      const candidate = Math.max(
        bufferedPosition ?? 0,
        currentTime ?? 0,
        stats.lastBufferedSeconds
      );
      accumulate(candidate);
    };

    const handleVideoTrackChange = ({
      videoTrack,
    }: {
      videoTrack: { bitrate: number | null } | null;
    }) => {
      stats.videoBitrate = pickBitrate(videoTrack?.bitrate, stats.videoBitrate);
    };

    const handleAudioTrackChange = ({
      audioTrack,
    }: {
      audioTrack: { bitrate: number | null } | null;
    }) => {
      stats.audioBitrate = pickBitrate(audioTrack?.bitrate, stats.audioBitrate);
    };

    const handleSourceLoad = ({
      availableVideoTracks,
      availableAudioTracks,
    }: {
      availableVideoTracks?: Array<{ bitrate: number | null }>;
      availableAudioTracks?: Array<{ bitrate: number | null }>;
    }) => {
      const firstVideo =
        availableVideoTracks?.find(
          (track) => track.bitrate && track.bitrate > 0
        ) ?? availableVideoTracks?.[0];

      const firstAudio =
        availableAudioTracks?.find(
          (track) => track.bitrate && track.bitrate > 0
        ) ?? availableAudioTracks?.[0];

      stats.videoBitrate = pickBitrate(
        firstVideo?.bitrate,
        stats.videoBitrate
      );
      stats.audioBitrate = pickBitrate(
        firstAudio?.bitrate,
        stats.audioBitrate
      );
    };

    // Set shorter update interval for finer granularity
    player.timeUpdateEventInterval = Math.min(
      player.timeUpdateEventInterval || 0.5,
      0.5
    );

    const subs = [
      player.addListener("timeUpdate", handleTimeUpdate),
      player.addListener("videoTrackChange", handleVideoTrackChange),
      player.addListener("audioTrackChange", handleAudioTrackChange),
      player.addListener("sourceLoad", handleSourceLoad),
    ];

    // If buffered data already present (e.g., autoplay), account for it
    try {
      const buffered = (player as unknown as { bufferedPosition?: number })
        .bufferedPosition;
      if (buffered && buffered > 0) {
        accumulate(buffered);
      }
    } catch {
      // ignore
    }

    return () => {
      subs.forEach((sub) => sub.remove());
    };
  }, [player, enabled, contentId]);
};
