import { providerTypeOrdersSchema, updateCasinoSettingsSchema } from 'helper';

describe('providerTypeOrdersSchema', () => {
  it('accepts a valid items list and an empty list', () => {
    expect(providerTypeOrdersSchema.safeParse({
      items: [
        { gameType: 'videoSlots', sortOrder: 0 },
        { gameType: 'LiveGames', sortOrder: 1 },
      ],
    }).success).toBe(true);
    expect(providerTypeOrdersSchema.safeParse({ items: [] }).success).toBe(true);
  });

  it('rejects duplicate gameType and negative sortOrder', () => {
    expect(providerTypeOrdersSchema.safeParse({
      items: [
        { gameType: 'videoSlots', sortOrder: 0 },
        { gameType: 'videoSlots', sortOrder: 1 },
      ],
    }).success).toBe(false);
    expect(providerTypeOrdersSchema.safeParse({
      items: [{ gameType: 'videoSlots', sortOrder: -1 }],
    }).success).toBe(false);
  });
});

describe('updateCasinoSettingsSchema', () => {
  it('accepts current admin payload shapes (all fields optional)', () => {
    expect(updateCasinoSettingsSchema.safeParse({}).success).toBe(true);
    expect(updateCasinoSettingsSchema.safeParse({
      headerCategories: ['videoSlots', 'LiveGames'],
    }).success).toBe(true);
    expect(updateCasinoSettingsSchema.safeParse({
      lobbySlots: [{ id: '1', kind: 'both', categoryType: 'videoSlots', providerName: 'pragmatic', label: 'Casino' }],
      footerLinks: [{ id: '1', label: 'Términos', href: '/terminos', visible: true }],
      bottomNavItems: [{ categoryType: 'videoSlots', visible: true }],
    }).success).toBe(true);
  });

  it('rejects more than 6 visible bottom nav items', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(t => ({ categoryType: t, visible: true }));
    expect(updateCasinoSettingsSchema.safeParse({ bottomNavItems: items }).success).toBe(false);
    // 7 items but only 6 visible is fine
    items[6].visible = false;
    expect(updateCasinoSettingsSchema.safeParse({ bottomNavItems: items }).success).toBe(true);
  });

  it('accepts a custom theme with background gradient and game card', () => {
    expect(updateCasinoSettingsSchema.safeParse({
      theme: 'custom',
      themeConfig: {
        base: 'dark',
        tokens: { primary: '#7c5cff' },
        backgroundGradient: { angle: 135, from: '#000000', to: '#ffffff', via: '#334455' },
        gameCard: { background: '#111111', border: '#222222', radius: 12, overlay: '#000000' },
      },
    }).success).toBe(true);
  });

  it('rejects invalid themeConfig gradient and game card values', () => {
    expect(updateCasinoSettingsSchema.safeParse({
      themeConfig: { base: 'dark', backgroundGradient: { angle: 500, from: '#000', to: '#fff' } },
    }).success).toBe(false);
    expect(updateCasinoSettingsSchema.safeParse({
      themeConfig: { base: 'dark', backgroundGradient: { angle: 90, from: 'javascript:alert(1)', to: '#fff' } },
    }).success).toBe(false);
    expect(updateCasinoSettingsSchema.safeParse({
      themeConfig: { base: 'dark', gameCard: { radius: 500 } },
    }).success).toBe(false);
  });

  it('accepts a saved themes library and a null activeThemeId', () => {
    expect(updateCasinoSettingsSchema.safeParse({
      savedThemes: [
        { id: 't1', name: 'Verde', config: { base: 'dark', tokens: { primary: '#00ff00' } } },
      ],
      activeThemeId: 't1',
    }).success).toBe(true);
    expect(updateCasinoSettingsSchema.safeParse({ activeThemeId: null }).success).toBe(true);
  });

  it('rejects saved themes without a name or with too many entries', () => {
    expect(updateCasinoSettingsSchema.safeParse({
      savedThemes: [{ id: 't1', config: { base: 'dark' } }],
    }).success).toBe(false);

    const many = Array.from({ length: 31 }, (_, index) => ({
      id: 't' + index,
      name: 'T' + index,
      config: { base: 'dark' },
    }));
    expect(updateCasinoSettingsSchema.safeParse({ savedThemes: many }).success).toBe(false);
  });

  it('rejects duplicate categoryType in bottomNavItems', () => {
    expect(updateCasinoSettingsSchema.safeParse({
      bottomNavItems: [
        { categoryType: 'videoSlots', visible: true },
        { categoryType: 'videoSlots', visible: false },
      ],
    }).success).toBe(false);
  });
});
