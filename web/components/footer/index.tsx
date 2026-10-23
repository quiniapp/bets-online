"use client"
import Link from "next/link";
import { useCasinoSettings } from "@/hooks/useCasinoSettings";
import { Flex } from "@/components/flex";

const Footer = () => {
  const { footerLinks } = useCasinoSettings();
  const visibleLinks = footerLinks.filter(l => l.visible);

  return (
    <footer className="border-t border-border mt-8">
      <Flex className="p-4 justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">&copy; 2025 Bett Arena</p>
        <Flex className="gap-4 flex-wrap">
          {visibleLinks.map(link => (
            <Link
              key={link.id}
              href={link.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {visibleLinks.length === 0 && (
            <span className="text-xs text-muted-foreground">legales</span>
          )}
        </Flex>
      </Flex>
    </footer>
  );
};

export default Footer;
