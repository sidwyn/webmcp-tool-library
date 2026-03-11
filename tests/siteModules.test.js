import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const sitesDir = join(__dirname, '../content/sites');
const sites = readdirSync(sitesDir).filter(d =>
  d !== '_template' && existsSync(join(sitesDir, d, 'injector.js'))
);

// Load background.js to extract SITE_MODULES
const bgSource = readFileSync(join(__dirname, '../background.js'), 'utf-8');
const siteModulesMatch = bgSource.match(/const SITE_MODULES\s*=\s*(\[[\s\S]*?\n\];)/);

let SITE_MODULES = [];
if (siteModulesMatch) {
  SITE_MODULES = vm.runInNewContext(`(${siteModulesMatch[1].replace(/;\s*$/, '')})`);
}

describe('Site module structure', () => {
  it('has at least one site module', () => {
    expect(sites.length).toBeGreaterThanOrEqual(1);
  });

  for (const site of sites) {
    describe(`site: ${site}`, () => {
      const siteDir = join(sitesDir, site);

      it('has injector.js', () => {
        expect(existsSync(join(siteDir, 'injector.js'))).toBe(true);
      });

      it('has helpers.js', () => {
        expect(existsSync(join(siteDir, 'helpers.js'))).toBe(true);
      });

      it('has prompt.js', () => {
        expect(existsSync(join(siteDir, 'prompt.js'))).toBe(true);
      });

      it('has a tools/ directory with at least one tool', () => {
        const toolsDir = join(siteDir, 'tools');
        expect(existsSync(toolsDir)).toBe(true);
        const tools = readdirSync(toolsDir).filter(f => f.endsWith('.js'));
        expect(tools.length).toBeGreaterThanOrEqual(1);
      });
    });
  }
});

describe('SITE_MODULES in background.js', () => {
  it('parsed SITE_MODULES from background.js', () => {
    expect(SITE_MODULES.length).toBeGreaterThanOrEqual(1);
  });

  for (const mod of SITE_MODULES) {
    describe(`module: ${mod.id}`, () => {
      it('has an id', () => {
        expect(mod.id).toBeDefined();
        expect(mod.id.length).toBeGreaterThan(0);
      });

      it('has match patterns', () => {
        expect(mod.matches).toBeDefined();
        expect(mod.matches.length).toBeGreaterThan(0);
      });

      it('has js files', () => {
        expect(mod.js).toBeDefined();
        expect(mod.js.length).toBeGreaterThan(0);
      });

      it('starts with bridge.js and helpers.js', () => {
        expect(mod.js[0]).toBe('content/bridge.js');
        expect(mod.js[1]).toBe('content/helpers.js');
      });

      it('ends with injector.js', () => {
        expect(mod.js[mod.js.length - 1]).toMatch(/injector\.js$/);
      });

      it('all referenced JS files exist', () => {
        for (const file of mod.js) {
          const fullPath = join(__dirname, '..', file);
          expect(existsSync(fullPath), `Missing: ${file}`).toBe(true);
        }
      });

      it('has a corresponding site directory', () => {
        expect(existsSync(join(sitesDir, mod.id))).toBe(true);
      });
    });
  }
});
