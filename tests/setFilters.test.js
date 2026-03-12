import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// We can test the airlineMatches logic and schema without DOM
describe('SetFiltersTool schema', () => {
  const source = readFileSync(join(__dirname, '../content/sites/google-flights/tools/setFilters.js'), 'utf-8');

  // Extract the inputSchema
  const schemaMatch = source.match(/inputSchema:\s*(\{[\s\S]*?\n\s{2}\})/);

  it('has schema definition', () => {
    expect(schemaMatch).not.toBeNull();
  });

  it('defines stops enum', () => {
    expect(source).toContain("'any'");
    expect(source).toContain("'nonstop'");
    expect(source).toContain("'1_or_fewer'");
    expect(source).toContain("'2_or_fewer'");
  });

  it('defines maxPrice as integer', () => {
    expect(source).toContain('maxPrice');
    expect(source).toContain("type: 'integer'");
  });

  it('supports airline filtering', () => {
    expect(source).toContain('airlines');
    expect(source).toContain('Comma-separated');
  });

  it('supports time filters', () => {
    expect(source).toContain('departureTimeStart');
    expect(source).toContain('departureTimeEnd');
    expect(source).toContain('arrivalTimeStart');
    expect(source).toContain('arrivalTimeEnd');
  });

  it('supports bag filters', () => {
    expect(source).toContain('carryOnBags');
    expect(source).toContain('checkedBags');
  });
});

describe('airlineMatches function', () => {
  // Mirror of the matching logic from setFilters.js — must stay in sync
  function airlineMatches(name, wanted) {
    if (name === wanted) return true;
    if (wanted.length >= 4 && name.includes(wanted)) return true;
    if (name.length >= 4 && wanted.includes(name)) return true;
    const nameWords = name.split(/\s+/);
    const wantedWords = wanted.split(/\s+/);
    if (wantedWords.some(ww => ww.length >= 4 && nameWords.some(w => w.startsWith(ww)))) return true;
    if (nameWords.some(w => w.length >= 4 && wantedWords.some(ww => ww.startsWith(w)))) return true;
    return false;
  }

  it('matches exact name', () => {
    expect(airlineMatches('singapore airlines', 'singapore airlines')).toBe(true);
  });

  it('matches partial name (substring)', () => {
    expect(airlineMatches('singapore airlines', 'singapore')).toBe(true);
  });

  it('matches reverse substring', () => {
    expect(airlineMatches('united', 'united airlines')).toBe(true);
  });

  it('matches word-start', () => {
    expect(airlineMatches('american airlines', 'american')).toBe(true);
  });

  it('does not match unrelated airlines', () => {
    expect(airlineMatches('delta', 'united')).toBe(false);
  });

  it('matches single word airlines', () => {
    expect(airlineMatches('jetblue', 'jetblue')).toBe(true);
  });

  it('matches when wanted is shorter prefix', () => {
    expect(airlineMatches('alaska airlines', 'alaska')).toBe(true);
  });

  // Critical regression tests: "Air X" airlines must NOT match "Y Airlines"
  it('does NOT match Air Cambodia when wanting Singapore Airlines', () => {
    expect(airlineMatches('air cambodia', 'singapore airlines')).toBe(false);
  });

  it('does NOT match Air China when wanting Singapore Airlines', () => {
    expect(airlineMatches('air china', 'singapore airlines')).toBe(false);
  });

  it('does NOT match Air India when wanting United Airlines', () => {
    expect(airlineMatches('air india', 'united airlines')).toBe(false);
  });

  it('matches Singapore Airlines when wanting Singapore Airlines', () => {
    expect(airlineMatches('singapore airlines', 'singapore airlines')).toBe(true);
  });

  it('matches Air India when wanting Air India', () => {
    expect(airlineMatches('air india', 'air india')).toBe(true);
  });

  it('matches short exact names like "sq"', () => {
    expect(airlineMatches('sq', 'sq')).toBe(true);
  });
});
