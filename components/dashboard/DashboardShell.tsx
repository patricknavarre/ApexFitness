'use client';

import { MoveLeaveModal } from '@/components/move/MoveLeaveModal';
import {
  MoveSessionGuardProvider,
  useMoveSessionGuard,
} from '@/context/MoveSessionGuardContext';
import { useState } from 'react';

function MoveLeaveModalHost() {
  const {
    leaveOpen,
    keepTracking,
    saveAndLeave,
    discardAndLeave,
  } = useMoveSessionGuard();
  const [saving, setSaving] = useState(false);

  return (
    <MoveLeaveModal
      open={leaveOpen}
      saving={saving}
      onKeepTracking={keepTracking}
      onSaveAndLeave={() => {
        setSaving(true);
        void saveAndLeave().finally(() => setSaving(false));
      }}
      onDiscard={discardAndLeave}
    />
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <MoveSessionGuardProvider>
      {children}
      <MoveLeaveModalHost />
    </MoveSessionGuardProvider>
  );
}
