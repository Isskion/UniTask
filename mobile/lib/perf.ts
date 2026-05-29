import { ProfilerOnRenderCallback } from 'react';

/**
 * Basic telemetry to log rendering performance.
 * In production, this can be connected to Firebase Performance Monitoring.
 */
export const onRenderTrace: ProfilerOnRenderCallback = (
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  // We can filter to only log components that take longer than 16ms (approx 60fps frame)
  if (actualDuration > 16) {
    console.warn(`[Performance] ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
  } else if (__DEV__) {
    // console.log(`[Performance] ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);
  }
};

export const logEvent = (eventName: string, params?: Record<string, any>) => {
  console.log(`[Event] ${eventName}`, params);
  // Send to Firebase Analytics
};
