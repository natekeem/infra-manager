"use client";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)] disabled:opacity-50", className)}>{children}</button>;
}
