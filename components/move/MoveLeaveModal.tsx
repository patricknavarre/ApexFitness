'use client';

type Props = {
  open: boolean;
  saving?: boolean;
  onKeepTracking: () => void;
  onSaveAndLeave: () => void;
  onDiscard: () => void;
};

export function MoveLeaveModal({
  open,
  saving = false,
  onKeepTracking,
  onSaveAndLeave,
  onDiscard,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onKeepTracking}
        disabled={saving}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-leave-title"
        className="relative w-full max-w-sm rounded-card border border-border bg-card shadow-glow p-5 space-y-4"
      >
        <div>
          <h2
            id="move-leave-title"
            className="font-display text-2xl text-tan uppercase tracking-wide"
          >
            End this activity?
          </h2>
          <p className="font-sans text-sm text-muted mt-2">
            You have an unsaved GPS route. Leaving without saving will discard your distance and
            path.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onKeepTracking}
            className="od-cta w-full min-h-[44px] rounded-card bg-accent px-4 py-3 font-sans text-sm font-bold uppercase text-black hover:shadow-glow disabled:opacity-50"
          >
            Keep tracking
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSaveAndLeave}
            className="od-cta w-full min-h-[44px] rounded-card border border-accent/50 px-4 py-3 font-sans text-sm font-bold uppercase text-accent hover:bg-accent/10 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & leave'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onDiscard}
            className="od-cta w-full min-h-[44px] rounded-card border border-border px-4 py-3 font-sans text-sm font-bold uppercase text-muted hover:text-accent2 hover:border-accent2/50 disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
