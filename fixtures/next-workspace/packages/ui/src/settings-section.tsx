export interface SettingsSectionProps {
  title: string;
}

export function SettingsSection({ title }: SettingsSectionProps) {
  return (
    <section className="rounded-lg border p-4">
      <h2>{title}</h2>
    </section>
  );
}
