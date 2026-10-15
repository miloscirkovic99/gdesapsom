import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Google does not fetch robots-blocked URLs while rendering, and every page of
 * this client-rendered site loads its content from /api/. Blocking it (as in
 * October 2026) made Googlebot see empty spot and blog pages marked noindex.
 */
describe('robots.txt', () => {
  const robots = readFileSync(join(__dirname, '../../public/robots.txt'), 'utf8');
  const rules = robots
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean);

  it('lets crawlers fetch the API the pages render from', () => {
    const disallowed = rules.filter((line) => /^disallow:/i.test(line)).map((line) => line.split(':')[1].trim());
    expect(disallowed.some((path) => path === '/' || '/api/v2/'.startsWith(path))).toBe(false);
  });

  it('points to the sitemap on the canonical host', () => {
    expect(rules).toContain('Sitemap: https://www.gdesapsom.com/sitemap.xml');
  });
});
