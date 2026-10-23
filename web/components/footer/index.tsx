"use client"
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { useCasinoSettings } from "@/hooks/useCasinoSettings";

const Footer = () => {
  const { footerLinks } = useCasinoSettings();
  const visibleLinks = footerLinks.filter(l => l.visible);

  return (
    <footer className="mt-10 border-t border-border/60 bg-gradient-to-b from-transparent to-primary/5">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="text-lg font-black tracking-tight text-foreground">ArenaBet</span>
            <p className="text-xs text-muted-foreground">© 2025 ArenaBet. Todos los derechos reservados.</p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {visibleLinks.map(link => (
              <Link
                key={link.id}
                href={link.href}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-border text-[10px] font-bold text-muted-foreground">
              18+
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Volver arriba
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
