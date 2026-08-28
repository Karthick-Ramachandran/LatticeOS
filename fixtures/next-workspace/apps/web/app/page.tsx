import { Button as PrimaryButton, SettingsCard, SettingsSection } from "@fixture/ui";

const preview = PrimaryButton({ label: "Preview" });

export default function Page() {
  return (
    <main>
      {preview}
      <SettingsSection title="Workspace settings" />
      <SettingsCard title="Billing" />
      <PrimaryButton label="Save" variant="secondary" />
    </main>
  );
}
