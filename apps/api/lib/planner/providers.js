/**
 * Request builders and response readers for the three model providers.
 * Plain data in, plain data out: the handler does the HTTP call (with the
 * 10 s timeout), so these can be tested without a network.
 *
 * Endpoints and fields, as documented on 2026-10-19:
 * - Gemini: generateContent with responseMimeType + responseJsonSchema;
 *   usageMetadata.{promptTokenCount, candidatesTokenCount, thoughtsTokenCount}
 *   (thinking is billed as output).
 * - Cloudflare Workers AI: /ai/run/{model} with an OpenAI-style
 *   response_format; the chat completion comes inside `result`.
 * - Anthropic Messages API: output_config.format json_schema;
 *   usage.{input_tokens, output_tokens}. Claude Haiku 5.5 accepts no
 *   temperature other than the default, so none is sent anywhere.
 */
const { MAX_OUTPUT_TOKENS, PRICES_PER_MTOK } = require('./config');

class ProviderError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const json = (body) => JSON.stringify(body);

function geminiRequest({ apiKey, model, system, user, schema }) {
  return {
    method: 'POST',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: json({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingLevel: 'minimal' },
      },
    }),
  };
}

function parseGemini(body) {
  const data = JSON.parse(body);
  const candidate = data.candidates && data.candidates[0];
  const usage = data.usageMetadata || {};
  const tokensIn = usage.promptTokenCount || 0;
  const tokensOut = (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0);
  if (!candidate || !candidate.content || candidate.finishReason !== 'STOP') {
    throw Object.assign(new ProviderError('incomplete', `Gemini finishReason ${candidate && candidate.finishReason}`), { tokensIn, tokensOut });
  }
  const text = (candidate.content.parts || [])
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
  return { text, tokensIn, tokensOut };
}

function cloudflareRequest({ accountId, token, model, system, user, schema }) {
  return {
    method: 'POST',
    url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: json({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'plan', schema, strict: true } },
      chat_template_kwargs: { enable_thinking: false },
      max_completion_tokens: MAX_OUTPUT_TOKENS,
    }),
  };
}

function parseCloudflare(body) {
  const data = JSON.parse(body);
  if (data.success === false) throw new ProviderError('error', `Workers AI: ${JSON.stringify(data.errors || []).slice(0, 200)}`);
  // /ai/run wraps the result; the OpenAI-compatible endpoint does not.
  const completion = data.result && data.result.choices ? data.result : data;
  const usage = completion.usage || {};
  const tokensIn = usage.prompt_tokens || 0;
  const tokensOut = usage.completion_tokens || 0;
  const choice = completion.choices && completion.choices[0];
  if (!choice || !choice.message || choice.finish_reason === 'length') {
    throw Object.assign(new ProviderError('incomplete', 'Workers AI: no complete message'), { tokensIn, tokensOut });
  }
  const content = choice.message.content;
  return { text: typeof content === 'string' ? content : JSON.stringify(content), tokensIn, tokensOut };
}

function anthropicRequest({ apiKey, model, system, user, schema }) {
  return {
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: json({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
      // Short structured answer under a 10 s timeout: no thinking, low effort.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    }),
  };
}

function parseAnthropic(body) {
  const data = JSON.parse(body);
  const usage = data.usage || {};
  const tokensIn = usage.input_tokens || 0;
  const tokensOut = usage.output_tokens || 0;
  if (data.stop_reason !== 'end_turn') {
    throw Object.assign(new ProviderError('incomplete', `Anthropic stop_reason ${data.stop_reason}`), { tokensIn, tokensOut });
  }
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return { text, tokensIn, tokensOut };
}

/** USD for one call, from the token counts the provider reported. */
function costUsd(provider, tokensIn, tokensOut) {
  const price = PRICES_PER_MTOK[provider];
  if (!price) return 0;
  return Math.round(((tokensIn * price.input + tokensOut * price.output) / 1e6) * 1e6) / 1e6;
}

/** The JSON object in a model reply; tolerates a ```json fence around it. */
function extractJson(text) {
  const trimmed = String(text || '').trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  try {
    return JSON.parse(fenced ? fenced[1] : trimmed);
  } catch {
    throw new ProviderError('bad_json', 'Reply is not valid JSON');
  }
}

module.exports = {
  ProviderError,
  geminiRequest,
  parseGemini,
  cloudflareRequest,
  parseCloudflare,
  anthropicRequest,
  parseAnthropic,
  costUsd,
  extractJson,
};
