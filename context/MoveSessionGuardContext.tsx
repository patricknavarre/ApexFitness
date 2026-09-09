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

  const register = useCallback((handlers: GuardHandlers | null) => {
    handlersRef.current = handlers;
  }, []);

  const setActive = useCallback((active: boolean) => {
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

  const tryNavigate = useCallback(
    (href: string) => {
      if (!isGuarded) return true;
      openLeave(href);
      return false;
    },
    [isGuarded, openLeave]
  );

  const requestLeave = useCallback(
    (href?: string) => {
      if (!isGuarded) {
        if (href) router.push(href);
        else router.push('/dashboard');
        return;
      }
      openLeave(href ?? '/dashboard');
    },
    [isGuarded, openLeave, router]
  );

  const keepTracking = useCallback(() => {
    setLeaveOpen(false);
    setPendingHref(null);
  }, []);

  const finishLeave = useCallback(() => {
    const href = pendingHref ?? '/dashboard';
    setLeaveOpen(false);
    setPendingHref(null);
    setIsGuarded(false);
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

  useEffect(() => {
    if (!isGuarded) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isGuarded]);

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
