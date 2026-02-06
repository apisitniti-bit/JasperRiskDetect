"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ide-bg">
      <h2 className="text-ide-error text-lg">เกิดข้อผิดพลาด</h2>
      <button
        onClick={reset}
        className="rounded bg-ide-accent px-4 py-2 text-white"
      >
        ลองใหม่
      </button>
    </div>
  );
}
