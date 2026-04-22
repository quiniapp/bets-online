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
      <Flex className="w-full max-w-[95vw] gap-2 px-4 py-3 flex-wrap">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-accent animate-pulse rounded-full" />
        ))}
      </Flex>
    );
  }

  if (providers.length === 0) return null;

  const activeProviders = providers.filter(p => p.isActive);

  const pills = (
    <>
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
          selected === null
            ? 'bg-primary text-primary-foreground scale-105'
            : 'bg-accent text-accent-foreground hover:bg-primary/80 hover:text-primary-foreground hover:scale-105'
        }`}
      >
        Todos
      </button>
      {activeProviders.map(provider => (
        <button
          key={provider.id}
          onClick={() => onSelect(selected === provider.name ? null : provider.name)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
            selected === provider.name
              ? 'bg-primary text-primary-foreground scale-105'
              : 'bg-accent text-accent-foreground hover:bg-primary/80 hover:text-primary-foreground hover:scale-105'
          }`}
        >
          {provider.displayName ?? provider.name}
        </button>
      ))}
    </>
  );

  if (expanded) {
    return (
      <Flex className="w-full max-w-[95vw] gap-2 px-4 py-3 flex-wrap">
        {pills}
        <button
          onClick={() => setExpanded(false)}
          className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
          aria-label="Contraer"
        >
          −
        </button>
      </Flex>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full max-w-[95vw] px-4 py-3">
      <div className="flex gap-2 flex-nowrap overflow-hidden flex-1">
        {pills}
      </div>
      <button
        onClick={() => setExpanded(true)}
        className="shrink-0 px-3 py-1.5 rounded-full text-sm font-bold bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all cursor-pointer"
        aria-label="Expandir"
      >
        +
      </button>
    </div>
  );
};

export default ProvidersBar;
