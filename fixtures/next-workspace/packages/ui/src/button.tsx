import { forwardRef, memo } from "react";

export interface Identifiable {
  id?: string;
}

export type ButtonProps = Identifiable & {
  label: string;
  variant?: "primary" | "secondary";
  count?: number;
};

export function Button({ label, variant = "primary", id, count }: ButtonProps) {
  return <button className="inline-flex items-center gap-2 rounded-md px-4 py-2" data-count={count} data-id={id} data-variant={variant}>{label}</button>;
}

export const SecondaryButton = ({ label, variant = "secondary" }: { label: string; variant?: "secondary" }) => (
  <button className="py-2 px-4 rounded-md gap-2 items-center inline-flex" data-variant={variant}>{label}</button>
);

export const MemoButton = memo(({ label }: { label: string }) => <button>{label}</button>);

export const ForwardedButton = forwardRef(({ label }: { label: string }, ref: unknown) => (
  <button ref={ref}>{label}</button>
));

export default function SettingsCard({ title }: { title: string }) {
  return <section><h2>{title}</h2></section>;
}

export const rejectedValue = () => "not a component";

export function lowercaseComponent() {
  return <div>Not indexed</div>;
}
