import { goodOutput, sampleInsightsRequest } from './insights.fixtures';
import { validateInsights } from './insights-validate';

describe('validateInsights', () => {
  const request = sampleInsightsRequest();

  it('keeps a reply that sticks to the request', () => {
    const insights = validateInsights(goodOutput(request), request);
    expect(insights?.summary).toContain('sertifikat');
    expect(insights?.steps).toHaveLength(2);
    expect(insights?.aiGenerated).toBe(true);
  });

  it('drops the whole explanation when the summary is missing or not text', () => {
    expect(validateInsights({ ...goodOutput(request), summary: '' }, request)).toBeNull();
    expect(validateInsights({ ...goodOutput(request), summary: 42 }, request)).toBeNull();
    expect(validateInsights('Ovo nije JSON objekat', request)).toBeNull();
    expect(validateInsights(null, request)).toBeNull();
  });

  it('drops a summary with a date or amount that is not in the request', () => {
    expect(validateInsights({ ...goodOutput(request), summary: 'Sertifikat izvadi do 29. novembra 2031.' }, request)).toBeNull();
    expect(validateInsights({ ...goodOutput(request), summary: 'Taksa iznosi 87654 dinara.' }, request)).toBeNull();
  });

  it('accepts dates and amounts copied from the request', () => {
    const insights = validateInsights({ ...goodOutput(request), summary: 'Sertifikat može najranije 10. decembra 2026.' }, request);
    expect(insights).not.toBeNull();
  });

  it('drops steps for unknown or confirmed requirements, and repeats', () => {
    const confirmed = request.readiness.items.find((item) => item.status === 'confirmed')?.key as string;
    const open = request.readiness.items.find((item) => item.status !== 'confirmed')?.key as string;
    const insights = validateInsights(
      {
        ...goodOutput(request),
        steps: [
          { requirementId: 'eu.invented-rule', text: 'Nabavi posebnu dozvolu.' },
          { requirementId: confirmed, text: 'Već je urađeno.' },
          { requirementId: open, text: 'Uradi ovo.' },
          { requirementId: open, text: 'Uradi ovo opet.' },
        ],
      },
      request,
    );
    expect(insights?.steps).toEqual([{ requirementId: open, text: 'Uradi ovo.' }]);
  });

  it('drops links and unknown cost categories', () => {
    const insights = validateInsights(
      {
        ...goodOutput(request),
        savings: [
          { category: 'accommodation', text: 'Rezerviši na www.primer.com.' },
          { category: 'casino', text: 'Ušteda.' },
          { category: 'fuel', text: 'Vozi ravnomerno.' },
        ],
      },
      request,
    );
    expect(insights?.savings).toEqual([{ category: 'fuel', text: 'Vozi ravnomerno.' }]);
  });

  it('cuts lists to their limits and rejects over-long texts', () => {
    const many = Array.from({ length: 10 }, () => ({ category: 'food', text: 'Ponesi hranu.' }));
    const insights = validateInsights({ ...goodOutput(request), savings: many, comparison: 'x'.repeat(600) }, request);
    expect(insights?.savings).toHaveLength(4);
    expect(insights?.comparison).toBe('');
  });
});
