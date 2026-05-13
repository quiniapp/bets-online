"use client"

import { useState } from 'react';
import { useProviders } from '@/hooks/useProviders';
import { Flex } from '../flex';

interface ProvidersBarProps {
  selected: string | null;
  onSelect: (name: string | null) => void;
}

const ProvidersBar = ({ selected, onSelect }: ProvidersBarProps) => {
  const { providers, loading } = useProviders();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Flex className="w-full max-w-[95vw] gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-24 shrink-0 bg-accent animate-pulse rounded-full" />
        ))}
      </Flex>
    );
  }

  if (providers.length === 0) return null;

  const activeProviders = providers.filter(p => p.isActive);

  const pillClass = (active: boolean) =>
    `shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
      active
        ? 'bg-primary text-primary-foreground scale-105'
        : 'bg-accent text-accent-foreground hover:bg-primary/80 hover:text-primary-foreground hover:scale-105'
    }`;

  const allPills = (
    <>
      <button onClick={() => onSelect(null)} className={pillClass(selected === null)}>
        Todos
      </button>
      {activeProviders.map(provider => (
        <button
          key={provider.id}
          onClick={() => onSelect(selected === provider.name ? null : provider.name)}
          className={pillClass(selected === provider.name)}
        >
          {provider.logoUrl ? (
            <img
              src={provider.logoUrl}
              alt={provider.displayName ?? provider.name}
              className="h-5 object-contain max-w-[80px]"
            />
          ) : (
            provider.displayName ?? provider.name
          )}
        </button>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile: horizontal scroll */}
      <div className="sm:hidden w-full min-w-0 overflow-x-auto scrollbar-none">
        <Flex className="gap-2 px-4 py-3 w-max">
          {allPills}
        </Flex>
      </div>

      {/* Desktop: expand/collapse */}
      <div className="hidden sm:block w-full max-w-[95vw]">
        {expanded ? (
          <Flex className="gap-2 px-4 py-3 flex-wrap">
            {allPills}
            <button
              onClick={() => setExpanded(false)}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              aria-label="Contraer"
            >
              −
            </button>
          </Flex>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex gap-2 flex-nowrap overflow-hidden flex-1">
              {allPills}
            </div>
            <button
              onClick={() => setExpanded(true)}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-bold bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all cursor-pointer"
              aria-label="Expandir"
            >
              +
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ProvidersBar;
