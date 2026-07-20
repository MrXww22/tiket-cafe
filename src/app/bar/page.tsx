import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Workstation } from "@/components/Workstation";

export default function BarPage() {
  return (
    <AppShell title="Панель бара">
      <AuthGate allowed={["ADMIN", "BAR"]}>
        <Workstation department="BAR" />
      </AuthGate>
    </AppShell>
  );
}
