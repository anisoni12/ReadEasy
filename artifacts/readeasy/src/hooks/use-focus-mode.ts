import { useCallback, useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface WakeLockApi {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

function getWakeLock(): WakeLockApi | undefined {
  return (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock;
}

export function useFocusMode() {
  const [isFocused, setIsFocused] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const enter = useCallback(async () => {
    setIsFocused(true);

    // Try to lock the screen awake (silences screen-sleep, keeps reading uninterrupted).
    try {
      const wakeLock = getWakeLock();
      if (wakeLock) {
        wakeLockRef.current = await wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake lock unavailable:', err);
    }

    // Try fullscreen (hides browser chrome and notifications on most mobile browsers).
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
      }
    } catch (err) {
      console.warn('Fullscreen unavailable:', err);
    }
  }, []);

  const exit = useCallback(async () => {
    setIsFocused(false);

    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  }, []);

  // Re-acquire wake lock if the page comes back to visibility.
  useEffect(() => {
    if (!isFocused) return;
    const onVisibility = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        try {
          const wakeLock = getWakeLock();
          if (wakeLock) {
            wakeLockRef.current = await wakeLock.request('screen');
          }
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isFocused]);

  // If the user exits fullscreen via the system (e.g. swipe down), exit focus too.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isFocused) {
        setIsFocused(false);
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(() => {});
          wakeLockRef.current = null;
        }
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isFocused]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  return { isFocused, enter, exit };
}
