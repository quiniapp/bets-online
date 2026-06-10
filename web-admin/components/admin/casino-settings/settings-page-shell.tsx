"use client"
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface SettingsPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Uniform chrome for every /admin/settings/casino subpage: back link to the
 * index, title, description and a mobile-first content column (320px+).
 */
export function SettingsPageShell({ title, description, children }: SettingsPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link
        href="/admin/settings/casino"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Personalización
      </Link>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
