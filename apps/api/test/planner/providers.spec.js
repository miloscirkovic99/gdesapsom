const providers = require('../../lib/planner/providers');
const { MODELS } = require('../../lib/planner/config');
const { PLAN_SCHEMAS } = require('../../lib/planner/prompt');

const input = { system: 'SYS', user: 'USER', schema: PLAN_SCHEMAS.dan };

describe('provider requests', () => {
  it('Gemini: generateContent with a JSON schema, key in a header, no temperature', () => {
    const request = providers.geminiRequest({ ...input, apiKey: 'g-key', model: MODELS.gemini });
    const body = JSON.parse(request.body);
    expect(request.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
    expect(request.headers['x-goog-api-key']).toBe('g-key');
    expect(request.url).not.toContain('g-key');
    expect(body.systemInstruction.parts[0].text).toBe('SYS');
    expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseJsonSchema: PLAN_SCHEMAS.dan });
    expect(JSON.stringify(body)).not.toContain('temperature');
  });

  it('Cloudflare: Workers AI run endpoint for Gemma 4 with json_schema', () => {
    const request = providers.cloudflareRequest({ ...input, accountId: 'acc', token: 'cf-token', model: MODELS.cloudflare });
    expect(request.url).toBe('https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/google/gemma-4-26b-a4b-it');
    expect(request.headers.Authorization).toBe('Bearer cf-token');
    expect(JSON.parse(request.body).response_format).toEqual({ type: 'json_schema', json_schema: { name: 'plan', schema: PLAN_SCHEMAS.dan, strict: true } });
  });

  it('Anthropic: Messages API with output_config.format and no sampling parameters', () => {
    const request = providers.anthropicRequest({ ...input, apiKey: 'a-key', model: MODELS.anthropic });
    const body = JSON.parse(request.body);
    expect(request.headers).toMatchObject({ 'x-api-key': 'a-key', 'anthropic-version': '2023-06-01' });
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.output_config.format).toEqual({ type: 'json_schema', schema: PLAN_SCHEMAS.dan });
    expect(body).not.toHaveProperty('temperature');
    expect(body.messages).toEqual([{ role: 'user', content: 'USER' }]);
  });
});

describe('provider responses', () => {
  it('Gemini: joins non-thought text, bills thinking as output', () => {
    const body = JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thinking…', thought: true }, { text: '{"a":' }, { text: '1}' }] } }],
      usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 50 },
    });
    expect(providers.parseGemini(body)).toEqual({ text: '{"a":1}', tokensIn: 1200, tokensOut: 350 });
  });

  it('Gemini: a cut-off answer is an error that still reports its tokens', () => {
    const body = JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2048 } });
    expect(() => providers.parseGemini(body)).toThrow(expect.objectContaining({ kind: 'incomplete', tokensIn: 10, tokensOut: 2048 }));
  });

  it('Cloudflare: reads the completion inside `result` or bare', () => {
    const completion = { choices: [{ message: { content: '{"a":1}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 900, completion_tokens: 200 } };
    const expected = { text: '{"a":1}', tokensIn: 900, tokensOut: 200 };
    expect(providers.parseCloudflare(JSON.stringify({ success: true, result: completion }))).toEqual(expected);
    expect(providers.parseCloudflare(JSON.stringify(completion))).toEqual(expected);
    expect(() => providers.parseCloudflare(JSON.stringify({ success: false, errors: [{ code: 3040 }] }))).toThrow('3040');
  });

  it('Anthropic: text blocks only, and a refusal is not a plan', () => {
    const ok = { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"a":1}' }], usage: { input_tokens: 800, output_tokens: 150 } };
    expect(providers.parseAnthropic(JSON.stringify(ok))).toEqual({ text: '{"a":1}', tokensIn: 800, tokensOut: 150 });
    expect(() => providers.parseAnthropic(JSON.stringify({ ...ok, stop_reason: 'refusal' }))).toThrow('refusal');
  });

  it('extractJson tolerates a code fence and rejects anything else', () => {
    expect(providers.extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => providers.extractJson('Evo plana: {"a":1}')).toThrow(expect.objectContaining({ kind: 'bad_json' }));
  });
});

describe('costUsd', () => {
  it('uses the configured price per 1M tokens', () => {
    expect(providers.costUsd('gemini', 1_000_000, 1_000_000)).toBe(1.75);
    expect(providers.costUsd('cloudflare', 2000, 1000)).toBe(0.0005);
    expect(providers.costUsd('anthropic', 3000, 800)).toBe(0.0007);
    expect(providers.costUsd('rules', 100, 100)).toBe(0);
  });
});
