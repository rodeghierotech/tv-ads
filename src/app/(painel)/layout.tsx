import { PanelShell } from "./panel-shell";
import { requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <PanelShell>{children}</PanelShell>;
}
