"use client"

import { useProviders } from '@/hooks/useProviders';
import { Flex } from '../flex';

interface ProvidersBarProps {
  selected: string | null;
  onSelect: (name: string | null) => void;
}

const ProvidersBar = ({ selected, onSelect }: ProvidersBarProps) => {
  const { providers, loading } = useProviders();

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

  return (
    <Flex className="w-full max-w-[95vw] gap-2 px-4 py-3 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selected === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-accent text-accent-foreground hover:bg-accent/80'
        }`}
      >
        Todos
      </button>
      {activeProviders.map(provider => (
        <button
          key={provider.id}
          onClick={() => onSelect(selected === provider.name ? null : provider.name)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === provider.name
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-accent-foreground hover:bg-accent/80'
          }`}
        >
          {provider.displayName ?? provider.name}
        </button>
      ))}
    </Flex>
  );
};

export default ProvidersBar;
