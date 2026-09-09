'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

type GuardHandlers = {
  /** Persist session then resolve. Returns false if save failed. */
  save: () => Promise<boolean>;
  /** Discard session without saving. */
  discard: () => void;
};

type MoveSessionGuardContextValue = {
  isGuarded: boolean;
  leaveOpen: boolean;
  register: (handlers: GuardHandlers | null) => void;
  setActive: (active: boolean) => void;
  tryNavigate: (href: string) => boolean;
  requestLeave: (href?: string) => void;
  keepTracking: () => void;
  saveAndLeave: () => Promise<void>;
  discardAndLeave: () => void;
};

const MoveSessionGuardContext = createContext<MoveSessionGuardContextValue | null>(null);

export function MoveSessionGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isGuarded, setIsGuarded] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const handlersRef = useRef<GuardHandlers | null>(null);
  /** Sync flag for beforeunload — React state alone can lag a tick. */
  const guardedRef = useRef(false);

  const register = useCallback((handlers: GuardHandlers | null) => {
    handlersRef.current = handlers;
  }, []);

  const setActive = useCallback((active: boolean) => {
    guardedRef.current = active;
    setIsGuarded(active);
    if (!active) {
      setLeaveOpen(false);
      setPendingHref(null);
    }
  }, []);

  const openLeave = useCallback((href: string | null) => {
    setPendingHref(href);
    setLeaveOpen(true);
  }, []);

  const isSessionActive = useCallback(
    () => guardedRef.current || handlersRef.current != null || isGuarded,
    [isGuarded]
  );

  const tryNavigate = useCallback(
    (href: string) => {
      if (!isSessionActive()) return true;
      openLeave(href);
      return false;
    },
    [isSessionActive, openLeave]
  );

  const requestLeave = useCallback(
    (href?: string) => {
      if (!isSessionActive()) {
        if (href) router.push(href);
        else router.push('/dashboard');
        return;
      }
      openLeave(href ?? '/dashboard');
    },
    [isSessionActive, openLeave, router]
  );

  const keepTracking = useCallback(() => {
    setLeaveOpen(false);
    setPendingHref(null);
  }, []);

  const finishLeave = useCallback(() => {
    const href = pendingHref ?? '/dashboard';
    setLeaveOpen(false);
    setPendingHref(null);
    guardedRef.current = false;
    setIsGuarded(false);
    handlersRef.current = null;
    router.push(href);
  }, [pendingHref, router]);

  const saveAndLeave = useCallback(async () => {
    const handlers = handlersRef.current;
    if (!handlers) {
      finishLeave();
      return;
    }
    const ok = await handlers.save();
    if (ok) finishLeave();
  }, [finishLeave]);

  const discardAndLeave = useCallback(() => {
    handlersRef.current?.discard();
    finishLeave();
  }, [finishLeave]);

  // Native browser “Leave site?” when closing the tab/window during an active Move.
  // Custom React modals cannot run on unload — this is the only allowed prompt.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!guardedRef.current) return;
      e.preventDefault();
      // Chrome / Safari / Firefox still require a non-empty returnValue to show the dialog.
      e.returnValue = 'You have an unsaved Move activity. Leave this page?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const value = useMemo(
    () => ({
      isGuarded,
      leaveOpen,
      register,
      setActive,
      tryNavigate,
      requestLeave,
      keepTracking,
      saveAndLeave,
      discardAndLeave,
    }),
    [
      isGuarded,
      leaveOpen,
      register,
      setActive,
      tryNavigate,
      requestLeave,
      keepTracking,
      saveAndLeave,
      discardAndLeave,
    ]
  );

  return (
    <MoveSessionGuardContext.Provider value={value}>{children}</MoveSessionGuardContext.Provider>
  );
}

export function useMoveSessionGuard() {
  const ctx = useContext(MoveSessionGuardContext);
  if (!ctx) {
    throw new Error('useMoveSessionGuard must be used within MoveSessionGuardProvider');
  }
  return ctx;
}

/** Safe for components that may render outside the provider (should not). */
export function useMoveSessionGuardOptional() {
  return useContext(MoveSessionGuardContext);
}
