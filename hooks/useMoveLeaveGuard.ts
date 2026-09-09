'use client';

import { useEffect, useRef } from 'react';
import { useMoveSessionGuard } from '@/context/MoveSessionGuardContext';

type Options = {
  active: boolean;
  save: () => Promise<boolean>;
  discard: () => void;
};

/**
 * Registers Move GPS session with the dashboard leave guard.
 * Call from MoveTracker while a session is watching or paused.
 *
 * Also arms a native beforeunload prompt (tab/window close) while active —
 * browsers will not show a custom modal on unload.
 */
export function useMoveLeaveGuard({ active, save, discard }: Options) {
  const guard = useMoveSessionGuard();
  const saveRef = useRef(save);
  const discardRef = useRef(discard);
  const activeRef = useRef(active);
  saveRef.current = save;
  discardRef.current = discard;
  activeRef.current = active;

  useEffect(() => {
    guard.setActive(active);
    if (active) {
      guard.register({
        save: () => saveRef.current(),
        discard: () => discardRef.current(),
      });
    } else {
      guard.register(null);
    }
    return () => {
      guard.register(null);
      guard.setActive(false);
    };
    // register/setActive are stable; only re-bind when active flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Belt-and-suspenders: listen even if context provider remounts mid-session.
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      e.returnValue = 'You have an unsaved Move activity. Leave this page?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  return guard;
}
