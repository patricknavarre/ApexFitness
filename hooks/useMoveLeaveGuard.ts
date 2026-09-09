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
 */
export function useMoveLeaveGuard({ active, save, discard }: Options) {
  const guard = useMoveSessionGuard();
  const saveRef = useRef(save);
  const discardRef = useRef(discard);
  saveRef.current = save;
  discardRef.current = discard;

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

  return guard;
}
