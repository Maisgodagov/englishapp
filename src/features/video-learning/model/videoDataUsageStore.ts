import { useEffect, useState } from "react";

type Subscriber = (bytes: number) => void;

let totalBytes = 0;
const subscribers = new Set<Subscriber>();

const notify = () => {
  for (const subscriber of subscribers) {
    subscriber(totalBytes);
  }
};

export const addVideoDataUsage = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return;
  }
  totalBytes += bytes;
  notify();
};

export const resetVideoDataUsage = () => {
  totalBytes = 0;
  notify();
};

export const getVideoDataUsage = () => totalBytes;

export const subscribeToVideoDataUsage = (subscriber: Subscriber) => {
  subscribers.add(subscriber);
  subscriber(totalBytes);
  return () => {
    subscribers.delete(subscriber);
  };
};

export const useVideoDataUsage = () => {
  const [bytes, setBytes] = useState(() => getVideoDataUsage());

  useEffect(() => {
    return subscribeToVideoDataUsage(setBytes);
  }, []);

  return bytes;
};
