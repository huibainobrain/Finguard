import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  spinner = false,
  tone = "neutral",
}: {
  title: string;
  description?: string;
  spinner?: boolean;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
      {spinner && <Spinner />}
      <p
        className={`text-sm font-semibold ${
          tone === "danger" ? "text-rose-600" : "text-slate-600"
        }`}
      >
        {title}
      </p>
      {description && <p className="max-w-sm text-xs text-slate-400">{description}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
    />
  );
}

export function EmptyStateAction({ children }: { children: ReactNode }) {
  return <div className="mt-1">{children}</div>;
}
