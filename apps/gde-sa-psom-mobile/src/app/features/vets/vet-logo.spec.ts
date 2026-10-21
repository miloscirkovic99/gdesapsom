import { SITE_ORIGIN } from '@gde/shared/util';
import { vetLogoUrl } from './vet-logo';

describe('vetLogoUrl', () => {
  it('keeps full URLs and inline images', () => {
    expect(vetLogoUrl('https://cdn.example.com/logo.png')).toBe('https://cdn.example.com/logo.png');
    expect(vetLogoUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('resolves site paths against the website, as the website does', () => {
    expect(vetLogoUrl('/assets/vet/logo.png')).toBe(`${SITE_ORIGIN}/assets/vet/logo.png`);
    expect(vetLogoUrl('assets/vet/logo.png')).toBe(`${SITE_ORIGIN}/assets/vet/logo.png`);
  });

  it('is null when the clinic has no logo', () => {
    expect(vetLogoUrl(null)).toBeNull();
    expect(vetLogoUrl(undefined)).toBeNull();
    expect(vetLogoUrl('  ')).toBeNull();
  });
});
