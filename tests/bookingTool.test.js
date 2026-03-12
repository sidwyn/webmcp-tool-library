import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { loadTool } from './helpers/loadSource.js';

// Mock browser globals
globalThis.window = { location: { href: 'https://www.google.com/travel/flights/booking' } };
globalThis.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  body: { innerText: '' }
};
globalThis.setTimeout = () => {};
globalThis.WebMCPHelpers = {
  findByText: () => null,
  findByAriaLabel: () => null,
  simulateClick: () => {},
  sleep: () => Promise.resolve(),
  parseGoogleFlightCard: () => ({}),
};

const GetBookingLinkTool = loadTool(
  join(__dirname, '../content/sites/google-flights/tools/getBookingLink.js'),
  'GetBookingLinkTool'
);

describe('GetBookingLinkTool', () => {
  describe('schema', () => {
    it('has correct name', () => {
      expect(GetBookingLinkTool.name).toBe('get_booking_link');
    });

    it('has fareRank property', () => {
      expect(GetBookingLinkTool.inputSchema.properties.fareRank).toBeDefined();
      expect(GetBookingLinkTool.inputSchema.properties.fareRank.type).toBe('integer');
    });

    it('has rank property', () => {
      expect(GetBookingLinkTool.inputSchema.properties.rank).toBeDefined();
      expect(GetBookingLinkTool.inputSchema.properties.rank.type).toBe('integer');
    });

    it('fareRank description mentions Continue', () => {
      expect(GetBookingLinkTool.inputSchema.properties.fareRank.description).toContain('Continue');
    });

    it('description mentions fare options and clicking Continue', () => {
      expect(GetBookingLinkTool.description).toContain('fare');
      expect(GetBookingLinkTool.description).toContain('Continue');
      expect(GetBookingLinkTool.description).toContain('fareRank');
    });
  });
});
