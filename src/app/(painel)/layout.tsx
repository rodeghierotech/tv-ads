import { PanelShell } from "./panel-shell";

export const dynamic = "force-dynamic";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
