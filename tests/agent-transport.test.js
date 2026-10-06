const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const test = require('node:test');

function clientFor(deliver) {
  const wire = {};
  const https = {
    request(url, options, onResponse) {
      Object.assign(wire, { url, options });
      const request = new EventEmitter();
      request.destroy = () => { wire.destroyed = true; };
      request.end = (body) => {
        wire.body = JSON.parse(body);
        if (!deliver) return;
        queueMicrotask(() => {
          const response = new EventEmitter();
          response.statusCode = deliver.status || 200;
          response.destroy = () => {};
          onResponse(response);
          if (deliver.abort) { response.emit('aborted'); return; }
          response.emit('data', Buffer.from(deliver.body));
          response.emit('end');
        });
      };
      return request;
    }
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../cloudfunctions/explainDetection/model-client.js'), 'utf8'), {
    module, exports: module.exports, require: (name) => { assert.equal(name, 'https'); return https; },
    URL, Buffer, setTimeout, clearTimeout
  });
  return { client: module.exports, wire };
}
const settings = { url: 'https://model.example/v1/chat/completions', apiKey: 'test-value', model: 'fixture-model' };

test('model transport sends bounded non-streaming chat completions', async () => {
  const { client, wire } = clientFor({ body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{}' } }] }) });
  const response = await client.callModel(settings, { messages: [{ role: 'user', content: 'hello' }], tools: [] }, 100);
  assert.equal(response.role, 'assistant');
  assert.equal(wire.url, settings.url);
  assert.equal(wire.options.headers.Authorization, 'Bearer test-value');
  assert.equal(wire.body.stream, false);
  assert.equal(wire.body.max_tokens, 1200);
  assert.equal(wire.body.model, 'fixture-model');
  assert.equal(wire.body.thinking, undefined);
});

test('DeepSeek requests disable thinking while retaining the required tool choice', async () => {
  for (const base of ['https://api.deepseek.com', 'https://api.deepseek.com/v1']) {
    const { client, wire } = clientFor({ body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{}' } }] }) });
    const configured = client.getSettings({ AI_ENABLED: 'true', LLM_BASE_URL: base, LLM_API_KEY: 'test-value', LLM_MODEL: 'fixture-model' });
    const toolChoice = { type: 'function', function: { name: 'read_current_record' } };
    await client.callModel(configured, { messages: [], tool_choice: toolChoice }, 100);
    assert.equal(wire.body.thinking.type, 'disabled');
    assert.deepEqual(wire.body.tool_choice, toolChoice);
  }
});

test('provider-specific thinking parameter is not sent to other compatible endpoints', async () => {
  const { client, wire } = clientFor({ body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{}' } }] }) });
  await client.callModel({ ...settings, url: 'https://api.deepseek.com.example/v1/chat/completions' }, {}, 100);
  assert.equal(wire.body.thinking, undefined);
});

test('transport rejects non-200, truncated, aborted and oversized responses without exposing body', async () => {
  const cases = [
    [{ status: 401, body: 'private provider error' }, 'AI_UNAVAILABLE'],
    [{ body: 'not JSON' }, 'AI_INVALID_OUTPUT'],
    [{ body: JSON.stringify({ choices: [{ finish_reason: 'length', message: { role: 'assistant', content: '{}' } }] }) }, 'AI_INVALID_OUTPUT'],
    [{ body: 'x'.repeat(128 * 1024 + 1) }, 'AI_INVALID_OUTPUT'],
    [{ abort: true }, 'AI_UNAVAILABLE']
  ];
  for (const [delivery, expected] of cases) {
    const { client } = clientFor(delivery);
    await assert.rejects(() => client.callModel(settings, {}, 100), (error) => error.code === expected && !error.message.includes('private'));
  }
});

test('wall-clock timeout also aborts a connection which never produces a response', async () => {
  const { client, wire } = clientFor(null);
  await assert.rejects(() => client.callModel(settings, {}, 5), (error) => error.code === 'AI_TIMEOUT');
  assert.equal(wire.destroyed, true);
});
