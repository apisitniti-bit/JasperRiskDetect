export function PanelSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ide-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ide-accent border-t-transparent" />
        <span className="text-sm text-ide-text-muted">กำลังโหลด...</span>
      </div>
    </div>
  );
}

export function ErrorListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-ide-sidebar" />
      ))}
    </div>
  );
}

export function ViewerSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ide-accent border-t-transparent" />
        <span className="text-xs text-ide-text-muted">กำลังโหลด JRXML Viewer...</span>
      </div>
    </div>
  );
}

export function ScoreSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="h-32 w-32 animate-pulse rounded-full bg-ide-sidebar" />
      <div className="h-4 w-20 animate-pulse rounded bg-ide-sidebar" />
    </div>
  );
}
