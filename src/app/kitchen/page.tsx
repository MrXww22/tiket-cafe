import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { Workstation } from "@/components/Workstation";

export default function KitchenPage() {
  return (
    <AppShell title="Панель кухни">
      <AuthGate allowed={["ADMIN", "KITCHEN"]}>
        <Workstation department="KITCHEN" />
      </AuthGate>
    </AppShell>
  );
}
