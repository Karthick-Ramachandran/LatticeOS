import { Button, SettingsSection } from "@fixture/ui";

export default function NotificationsPage() {
  return (
    <main>
      <SettingsSection title="Notification settings" />
      <Button label="Save" variant="primary" />
    </main>
  );
}
