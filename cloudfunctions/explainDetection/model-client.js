const https = require('https');

function serviceError(code) { return Object.assign(new Error(code), { code }); }
function getSettings(env) {
  const enabled = env.AI_ENABLED === 'true';
  const providerLabel = String(env.AI_PROVIDER_LABEL || 'AI service').slice(0, 80);
  if (!enabled) return { enabled: false, providerLabel };
  let url;
  try { url = new URL(String(env.LLM_BASE_URL || '').replace(/\/+$/, '') + '/chat/completions'); }
  catch (error) { throw serviceError('AI_CONFIG_ERROR'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !env.LLM_API_KEY || !env.LLM_MODEL) {
    throw serviceError('AI_CONFIG_ERROR');
  }
  return { enabled, providerLabel, url: url.toString(), apiKey: env.LLM_API_KEY, model: env.LLM_MODEL };
}

function callModel(settings, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const requestPayload = Object.assign({ model: settings.model, stream: false, max_tokens: 1200 }, payload);
    // DeepSeek thinking mode rejects the named tool_choice required by this agent.
    // Apply the provider-specific parameter only to its official API host.
    if (new URL(settings.url).hostname === 'api.deepseek.com') {
      requestPayload.thinking = { type: 'disabled' };
    }
    const body = JSON.stringify(requestPayload);
    let settled = false;
    let deadline;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) reject(error); else resolve(value);
    };
    const request = https.request(settings.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}`, 'Content-Length': Buffer.byteLength(body) }
    }, (response) => {
      const chunks = [];
      let length = 0;
      response.on('data', (chunk) => {
        length += chunk.length;
        if (length > 128 * 1024) {
          finish(serviceError('AI_INVALID_OUTPUT'));
          response.destroy();
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', () => finish(serviceError('AI_UNAVAILABLE')));
      response.on('aborted', () => finish(serviceError('AI_UNAVAILABLE')));
      response.on('end', () => {
        if (response.statusCode !== 200) return finish(Object.assign(serviceError('AI_UNAVAILABLE'), { providerStatus: response.statusCode }));
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const choice = data.choices && data.choices[0];
          if (!choice || !choice.message || choice.finish_reason === 'length') return finish(serviceError('AI_INVALID_OUTPUT'));
          finish(null, choice.message);
        } catch (error) { finish(serviceError('AI_INVALID_OUTPUT')); }
      });
    });
    // A wall-clock deadline also covers DNS, connection and a slowly trickling response.
    deadline = setTimeout(() => { finish(serviceError('AI_TIMEOUT')); request.destroy(); }, timeoutMs);
    request.on('error', () => finish(serviceError('AI_UNAVAILABLE')));
    request.end(body);
  });
}
module.exports = { getSettings, callModel, serviceError };
