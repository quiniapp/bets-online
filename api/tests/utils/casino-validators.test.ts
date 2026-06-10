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

  it('rejects duplicate categoryType in bottomNavItems', () => {
    expect(updateCasinoSettingsSchema.safeParse({
      bottomNavItems: [
        { categoryType: 'videoSlots', visible: true },
        { categoryType: 'videoSlots', visible: false },
      ],
    }).success).toBe(false);
  });
});
