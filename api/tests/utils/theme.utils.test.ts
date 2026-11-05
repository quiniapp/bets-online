import {
  THEME_TOKEN_NAMES,
  backgroundGradientToCss,
  generateThemeTokens,
  getContrastRatio,
  readableForeground,
} from 'helper';

const COLOR = /^(#[0-9a-fA-F]{3,8}|rgb|hsl|oklch|color)/;

describe('generateThemeTokens', () => {
  it('returns a value for every known token (dark)', () => {
    const tokens = generateThemeTokens({ mode: 'dark', primary: '#7c5cff' });
    for (const name of THEME_TOKEN_NAMES) {
      expect(typeof tokens[name]).toBe('string');
      expect(tokens[name]).toMatch(COLOR);
    }
    expect(Object.keys(tokens).sort()).toEqual([...THEME_TOKEN_NAMES].sort());
  });

  it('returns a value for every known token (light)', () => {
    const tokens = generateThemeTokens({ mode: 'light', primary: '#0ea5e9' });
    for (const name of THEME_TOKEN_NAMES) expect(tokens[name]).toMatch(COLOR);
  });

  it('honours the background and accent seeds', () => {
    const tokens = generateThemeTokens({
      mode: 'dark',
      primary: '#7c5cff',
      background: '#101820',
      accent: '#203040',
    });
    expect(tokens['background']).toBe('#101820');
    expect(tokens['accent']).toBe('#203040');
  });

  it('picks a foreground readable on the primary color', () => {
    const tokens = generateThemeTokens({ mode: 'dark', primary: '#7c5cff' });
    expect(getContrastRatio(tokens['primary'], tokens['primary-foreground'])).toBeGreaterThan(4);
  });

  it('is deterministic', () => {
    const a = generateThemeTokens({ mode: 'dark', primary: '#ff8800' });
    const b = generateThemeTokens({ mode: 'dark', primary: '#ff8800' });
    expect(a).toEqual(b);
  });
});

describe('readableForeground', () => {
  it('uses dark text on light backgrounds and light text on dark ones', () => {
    expect(readableForeground('#ffffff')).toBe('#0a0a0a');
    expect(readableForeground('#000000')).toBe('#fafafa');
  });
});

describe('backgroundGradientToCss', () => {
  it('builds a linear-gradient with from/to', () => {
    expect(backgroundGradientToCss({ angle: 90, from: '#000000', to: '#ffffff' }))
      .toBe('linear-gradient(90deg, #000000, #ffffff)');
  });

  it('includes the optional middle stop', () => {
    expect(backgroundGradientToCss({ angle: 180, from: '#000', to: '#fff', via: '#888' }))
      .toBe('linear-gradient(180deg, #000, #888, #fff)');
  });

  it('returns none when there is no usable gradient', () => {
    expect(backgroundGradientToCss(null)).toBe('none');
    expect(backgroundGradientToCss(undefined)).toBe('none');
  });
});
