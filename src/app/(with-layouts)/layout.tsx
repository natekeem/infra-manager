import { AppShell } from "@/components/common/app-shell";

export default function WithLayouts({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
