import type { ReactNode } from 'react';

export function LoadingState({ children = 'Loading…' }: { children?: ReactNode }) {
  return <p aria-live="polite" className="rounded-lg bg-slate-100 p-4 text-slate-700">{children}</p>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-dashed border-slate-300 bg-white p-6"><h2 className="font-semibold text-ink">{title}</h2><p className="mt-2 break-words text-slate-600">{children}</p></section>;
}

export function ErrorState({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{children}</p>;
}

export function AccessDenied() {
  return <ErrorState>You do not have permission to view this information.</ErrorState>;
}

export function FormField({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return <label className="grid min-w-0 gap-1 text-sm font-medium text-ink"><span className="break-words">{label}</span>{children}{error ? <span className="break-words text-red-700">{error}</span> : null}</label>;
}
