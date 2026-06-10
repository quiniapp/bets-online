// Fallback Spanish labels for game types when game_types.display_name is not
// set. Single source for every casino-settings editor.
export const TYPE_LABELS: Record<string, string> = {
  videoSlots:   'Casino',
  LiveGames:    'Casino en Vivo',
  CrashGame:    'Crash',
  Roulette:     'Ruletas',
  Blackjack:    'Blackjack',
  Baccarat:     'Baccarat',
  Bingo:        'Bingo',
  Plinko:       'Plinko',
  ActionGames:  'Acción',
  InstantGames: 'Instantáneos',
  Dice:         'Dados',
  Scratch:      'Scratch',
  Lottery:      'Lotería',
};

export function typeLabel(type: string, displayName?: string | null): string {
  return displayName || TYPE_LABELS[type] || type;
}
