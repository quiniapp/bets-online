"use client"
import { Input } from '@/components/ui/input';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** Native color picker plus a hex input so the generator stays dependency-free. */
export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-7 w-9 cursor-pointer rounded border bg-transparent"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-7 w-24 font-mono text-xs uppercase"
          maxLength={9}
        />
      </span>
    </label>
  );
}
