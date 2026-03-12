import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read prompt.js source and extract the prompt string content
const source = readFileSync(join(__dirname, '../content/sites/google-flights/prompt.js'), 'utf-8');
// The prompt is a template literal: const GOOGLE_FLIGHTS_PROMPT = `...`;
// Extract everything between the first backtick and the last backtick+semicolon
const match = source.match(/GOOGLE_FLIGHTS_PROMPT\s*=\s*`([\s\S]*)`\s*;/);
const prompt = match ? match[1] : '';

describe('Google Flights prompt', () => {
  it('defines GOOGLE_FLIGHTS_PROMPT', () => {
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('lists all 14 tools', () => {
    const tools = [
      'search_flights', 'get_results', 'set_filters', 'set_search_options',
      'sort_results', 'get_price_insights', 'get_flight_details', 'track_price',
      'explore_destinations', 'search_multi_city', 'set_connecting_airports',
      'get_tracked_flights', 'get_booking_link', 'select_return_flight'
    ];
    for (const tool of tools) {
      expect(prompt, `missing tool: ${tool}`).toContain(tool);
    }
  });

  it('includes page awareness instructions', () => {
    expect(prompt).toContain('PAGE AWARENESS');
    expect(prompt).toContain('get_results immediately');
  });

  it('includes booking flow with fareRank', () => {
    expect(prompt).toContain('fareRank');
    expect(prompt).toContain('click "Continue"');
  });

  it('includes mandatory destination fun facts instruction', () => {
    expect(prompt).toContain('DESTINATION FUN FACTS (MANDATORY)');
    expect(prompt).toContain('MUST include 2-3 fun facts');
    expect(prompt).toContain('Fun facts about [City]');
  });

  it('instructs not to tell user to click Continue themselves', () => {
    expect(prompt).toContain('do NOT just tell them to click it themselves');
  });

  it('includes multi-city search instructions', () => {
    expect(prompt).toContain('MULTI-CITY SEARCHES');
    expect(prompt).toContain('search_multi_city');
  });

  it('includes date grid instructions', () => {
    expect(prompt).toContain('Date Grid');
    expect(prompt).toContain('get_price_insights');
  });

  it('scopes to flights only', () => {
    expect(prompt).toContain('SCOPE');
    expect(prompt).toContain('I only support flight search');
  });
});
