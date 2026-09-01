import { Button, SettingsSection } from "@fixture/ui";

export default function NotificationSettingsPage() {
  return (
    <main>
      <SettingsSection title="Notification settings" />
      <Button label="Save" variant="primary" />
    </main>
  );
}
