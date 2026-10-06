const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const storage = new Map();
const app = { globalData: { runtimeMode: 'cloud', cloudReady: true, user: { openid: 'first-user' }, layout: { statusBarHeight: 24, navTotalHeight: 68 } } };
global.getApp = () => app;
global.wx = {
  getStorageSync: (key) => storage.get(key), setStorageSync: (key, value) => storage.set(key, JSON.parse(JSON.stringify(value))),
  removeStorageSync: (key) => storage.delete(key), cloud: {}, showToast() {},
  getWindowInfo: () => ({ statusBarHeight: 24, windowWidth: 375 }), getMenuButtonBoundingClientRect: () => null
};
const i18n = require('../miniprogram/utils/i18n');
const messages = require('../miniprogram/i18n/messages');
const conversations = require('../miniprogram/utils/agent-store');
const agent = require('../miniprogram/services/agent-service');
const cloud = require('../miniprogram/services/cloud-service');
const detection = require('../miniprogram/services/detection-service');
const store = require('../miniprogram/utils/store');
const sampleMessage = (content = 'Demo response', role = 'assistant') => ({ role, content, locale: 'en', source: 'ai' });
function reset() {
  storage.clear(); i18n.init();
  app.globalData.runtimeMode = 'cloud'; app.globalData.user = { openid: 'first-user' };
  app.globalData.cloudReady = true;
}
function loadPage(relative) {
  let definition;
  global.Page = (value) => { definition = value; };
  const filename = path.resolve(__dirname, '../miniprogram/pages', relative);
  delete require.cache[filename]; require(filename);
  const page = Object.assign({}, definition, { data: JSON.parse(JSON.stringify(definition.data)), setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); } });
  return page;
}

test('English defaults independently of system locale; preference persists and clear-data preserves it', () => {
  reset();
  assert.equal(i18n.getLocale(), 'en');
  assert.equal(i18n.t('home'), 'Home');
  i18n.setLocale('zh-CN'); i18n.init();
  assert.equal(i18n.getLocale(), 'zh-CN');
  conversations.save('record', { messages: [sampleMessage()] });
  store.saveDraft({ sampleName: 'draft' });
  store.clearLocalData();
  assert.equal(i18n.init(), 'zh-CN');
  assert.equal(store.getDraft().sampleName, '');
  assert.deepEqual(conversations.load('record').messages, []);
});

test('language updates mounted pages and derived labels without translating user data', () => {
  reset();
  let definition;
  global.Page = (value) => { definition = value; };
  i18n.page({ data: { records: [{ sampleName: '绿荧访客', note: '保留原文', storageSource: 'cloud', result: store.getDemoResult() }], statusText: i18n.t('identityReady') } });
  const page = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  page.onLoad({});
  assert.equal(page.data.records[0].resultView.pollutant, 'Naphthalene');
  i18n.setLocale('zh-CN');
  assert.equal(page.data.copy.home, '首页');
  assert.equal(page.data.records[0].resultView.gradeLabel, '轻度');
  assert.equal(page.data.records[0].sampleName, '绿荧访客');
  assert.equal(page.data.records[0].note, '保留原文');
  i18n.setLocale('en');
  page.setData({ result: store.getDemoResult() });
  assert.equal(page.data.resultView.gradeLabel, 'Mild');
  assert.equal(page.data.result.gradeLabel, '轻度');
  page.onUnload();
});

test('error messages use current language and never expose raw backend details', () => {
  reset();
  assert.match(cloud.createServiceError({ code: 'AI_TIMEOUT', message: 'sensitive data' }).message, /too long/);
  i18n.setLocale('zh-CN');
  assert.match(cloud.createServiceError({ code: 'AI_TIMEOUT' }).message, /超时/);
  assert.match(cloud.createServiceError(new Error('network timeout')).message, /网络连接异常/);
  assert.ok(!cloud.createServiceError({ code: 'UNKNOWN', message: 'sensitive data' }).message.includes('sensitive'));
});

test('cached conversations are isolated by user, record and offline mode', () => {
  reset(); conversations.save('r1', { messages: [sampleMessage('private')] });
  assert.equal(conversations.load('r1').messages[0].content, 'private');
  assert.equal(conversations.load('r2').messages.length, 0);
  app.globalData.user = { openid: 'second-user' };
  assert.equal(conversations.load('r1').messages.length, 0);
  app.globalData.runtimeMode = 'offline-demo';
  conversations.save('r1', { messages: [sampleMessage('offline')] });
  app.globalData.runtimeMode = 'cloud'; app.globalData.user = { openid: 'first-user' };
  assert.equal(conversations.load('r1').messages[0].content, 'private');
  conversations.remove('r1');
  assert.equal(conversations.load('r1').messages.length, 0);
});

test('cache caps twenty rounds and evicts oldest conversations within one MB', () => {
  reset();
  const entries = Array.from({ length: 50 }, (_, i) => sampleMessage('界'.repeat(1500), i % 2 ? 'assistant' : 'user'));
  for (let i = 0; i < 12; i += 1) conversations.save('record-' + i, { messages: entries });
  assert.equal(conversations.load('record-11').messages.length, 40);
  assert.equal(conversations.load('record-0').messages.length, 0);
  assert.ok(conversations.byteLength(storage.get('glowletter-ai-v1')) <= conversations.MAX_BYTES);
});

test('storage failures are surfaced and do not change the persisted language', () => {
  reset(); const write = wx.setStorageSync;
  wx.setStorageSync = () => { throw new Error('quota'); };
  assert.throws(() => conversations.save('r', { messages: [] }), /quota/);
  assert.throws(() => i18n.setLocale('zh-CN'), /quota/);
  assert.equal(i18n.getLocale(), 'en');
  wx.setStorageSync = write;
  storage.set('glowletter-ai-v1', { broken: true });
  assert.throws(() => conversations.load('r'), /AI_STORAGE_READ/);
  conversations.clearAll();
  assert.equal(conversations.load('r').messages.length, 0);
});

test('deleting a cloud record purges its cache only after success', async () => {
  reset(); conversations.save('r', { messages: [sampleMessage()] });
  wx.cloud.callFunction = async () => ({ result: { success: false, error: { code: 'IMAGE_DELETE_FAILED' } } });
  await assert.rejects(() => detection.deleteDetection('r'));
  assert.equal(conversations.load('r').messages.length, 1);
  wx.cloud.callFunction = async () => ({ result: { success: true, deleted: true } });
  await detection.deleteDetection('r');
  assert.equal(conversations.load('r').messages.length, 0);
});

test('offline tasks are labelled templates; online failures do not fall back', async () => {
  reset(); app.globalData.runtimeMode = 'offline-demo';
  const record = store.createRecord({ draft: { sampleName: 'offline' } });
  const response = await agent.request({ recordId: record.id, action: 'report', locale: 'en' });
  assert.equal(response.source, 'offline-example');
  assert.match(response.reportDraft, /No AI model called/);
  assert.match(response.reportDraft, /12\.6 mg\/L/);
  await assert.rejects(() => agent.request({ recordId: record.id, action: 'chat' }), /cloud mode/);
  app.globalData.runtimeMode = 'cloud';
  wx.cloud.callFunction = async () => { throw new Error('network timeout'); };
  await assert.rejects(() => agent.request({ recordId: 'r', action: 'explain' }), /Connection failed/);
});

test('bounded client history and deadline keep requests finite', async () => {
  reset();
  const history = Array.from({ length: 40 }, (_, i) => sampleMessage('x'.repeat(3000), i % 2 ? 'assistant' : 'user'));
  const bounded = agent.boundedHistory(history);
  assert.ok(bounded.length <= 12);
  assert.ok(bounded.reduce((n, item) => n + item.content.length, 0) <= 16000);
  assert.equal(bounded[0].role, 'user');
  await assert.rejects(() => agent.withDeadline(new Promise(() => {}), 5), /too long/);
});

test('result saves only once and retains the record ID when reopened', async () => {
  reset();
  const page = loadPage('result/result.js');
  page.onLoad({});
  const create = detection.createDetection;
  let complete; let calls = 0;
  detection.createDetection = () => { calls += 1; return new Promise((resolve) => { complete = resolve; }); };
  const first = page.saveRecord();
  assert.equal(await page.saveRecord(), null);
  complete({ id: 'saved-id' });
  assert.equal(await first, 'saved-id');
  assert.equal(await page.saveRecord(), 'saved-id');
  assert.equal(calls, 1);
  detection.createDetection = create;
  page.onUnload();
});

test('assistant ignores late replies after leaving the page', async () => {
  reset();
  const page = loadPage('assistant/assistant.js');
  const original = agent.request;
  let complete;
  agent.request = () => new Promise((resolve) => { complete = resolve; });
  page.recordId = 'r'; page.generation = 0; page.visible = true;
  page.data.record = { id: 'r' }; page.data.loading = false; page.data.enabled = true;
  const pending = page.send('explain', 'Explain');
  page.onHide();
  complete({ reply: 'late', source: 'ai', reportDraft: '', evidenceFields: [] });
  await pending;
  assert.equal(page.data.messages.length, 0);
  assert.equal(conversations.load('r').messages.length, 0);
  agent.request = original;
});

test('every WXML translation key exists in both languages; every route has four files', () => {
  const root = path.resolve(__dirname, '../miniprogram');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  assert.equal(config.tabBar, undefined);
  for (const route of config.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(path.join(root, route + '.' + extension)));
  }
  function check(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) check(file);
      else if (file.endsWith('.wxml')) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/\bcopy\.(\w+)/g)) assert.ok(messages[match[1]], `${file}: ${match[1]}`);
        const literals = source.replace(/{{[\s\S]*?}}/g, '');
        assert.ok(!/[\u4e00-\u9fff]/.test(literals), 'Unlocalized WXML: ' + file);
      }
    }
  }
  check(path.join(root, 'pages')); check(path.join(root, 'components'));
  Object.values(messages).forEach((entry) => assert.ok(entry.length === 2 && entry.every((value) => typeof value === 'string' && value.length)));
  for (const key of ['cancel', 'confirmClear', 'confirmDelete', 'aiSaveConfirm']) {
    for (const language of ['en', 'zh-CN']) assert.ok(i18n.t(key, language).length <= 4, 'Native modal label too long: ' + key);
  }
});

test('returning after backgrounding during initial load starts a fresh record check', async () => {
  reset();
  const page = loadPage('assistant/assistant.js');
  const getRecord = agent.getRecord;
  const status = agent.status;
  let reads = 0;
  agent.getRecord = () => { reads += 1; return new Promise(() => {}); };
  agent.status = async () => ({ enabled: false });
  page.onLoad({ id: 'r' });
  page.onShow();
  assert.equal(reads, 1);
  page.onHide();
  page.onShow();
  assert.equal(reads, 2);
  page.onUnload();
  agent.getRecord = getRecord;
  agent.status = status;
});

test('legacy application disclaimer is hidden without rewriting saved or user text', () => {
  reset();
  const page = loadPage('assistant/assistant.js');
  page.recordId = 'r';
  const getRecord = agent.getRecord;
  agent.getRecord = () => new Promise(() => {});
  page.onLoad({ id: 'r' });
  const prefix = '演示数据，不代表真实检测结论。暂无经验证的标准曲线、浓度换算、污染阈值或处理建议。';
  const original = prefix + '\n\n这是原来的解读。';
  page.setData({ messages: [sampleMessage(original), sampleMessage(original, 'user')] });
  assert.equal(page.data.messages[0].displayContent, '这是原来的解读。');
  assert.equal(page.data.messages[0].content, original);
  assert.equal(page.data.messages[1].displayContent, original);
  assert.equal(page.data.copy.aiReply, 'AI · Interpretation');
  page.onUnload(); agent.getRecord = getRecord;
});

test('native keyboard newlines remain in input and only the send button submits', () => {
  reset();
  const page = loadPage('assistant/assistant.js');
  const sent = [];
  page.send = (action, message) => sent.push({ action, message });
  page.onInput({ detail: { value: '中文选词\nsecond line', cursor: 16 } });
  assert.equal(sent.length, 0);
  assert.equal(page.data.input, '中文选词\nsecond line');
  page.sendMessage();
  assert.deepEqual(sent, [{ action: 'chat', message: '中文选词\nsecond line' }]);
  page.onInput({ detail: { value: '  ' } }); page.sendMessage();
  assert.equal(sent.length, 1);
  const wxml = fs.readFileSync(path.resolve(__dirname, '../miniprogram/pages/assistant/assistant.wxml'), 'utf8');
  assert.ok(wxml.includes('confirm-type="return"'));
  assert.ok(!wxml.includes('bindconfirm=') && !wxml.includes('newline-button'));
});

test('input height and keyboard height stay bounded', () => {
  reset();
  const page = loadPage('assistant/assistant.js');
  page.onInputLineChange({ detail: { height: 500 } }); assert.equal(page.data.inputHeight, 132);
  page.onInputLineChange({ detail: { height: 22 } }); assert.equal(page.data.inputHeight, 44);
  page.onKeyboardHeight({ detail: { height: 300 } }); assert.equal(page.data.keyboardHeight, 300);
  page.onKeyboardHeight({ detail: { height: 0 } }); assert.equal(page.data.keyboardHeight, 0);
});

test('question language is consistent on client and server, including quoted names and mixed input', () => {
  const client = require('../miniprogram/utils/agent-language').detectLanguage;
  const server = require('../cloudfunctions/explainDetection/language').detectLanguage;
  for (const [text, fallback, expected] of [
    ['hello', 'zh-CN', 'en'], ['请解释这条记录', 'en', 'zh-CN'],
    ['What does "绿荧来信" mean?', 'zh-CN', 'en'], ['解释 DeepSeek 的回复', 'en', 'zh-CN'],
    ['Explain this record\nWhat is missing?', 'zh-CN', 'en'],
    ['A01 这个样品缺少什么信息？', 'en', 'zh-CN'],
    ['123 😊', 'zh-CN', 'zh-CN'], ['123 😊', 'en', 'en']
  ]) {
    assert.equal(client(text, fallback), expected, text);
    assert.equal(server(text, fallback), expected, text);
  }
});

test('alternating questions select their own response language and repair old bubble labels', async () => {
  reset(); i18n.setLocale('zh-CN');
  const page = loadPage('assistant/assistant.js');
  const originalRead = agent.getRecord;
  const originalCall = wx.cloud.callFunction;
  const calls = [];
  const replies = ['Hello. What would you like to know about this record?', '这条记录缺少实验批次。'];
  agent.getRecord = () => new Promise(() => {});
  wx.cloud.callFunction = async ({ data }) => {
    calls.push(data);
    return { result: { success: true, recordId: 'r', locale: calls.length === 1 ? 'en' : 'zh-CN', source: 'ai', isDemo: true, reply: replies[calls.length - 1], reportDraft: '', evidenceFields: [] } };
  };
  try {
    page.onLoad({ id: 'r' });
    page.setData({ record: { id: 'r' }, loading: false, enabled: true, messages: [sampleMessage('你好，我可以解读这条记录。')] });
    assert.equal(page.data.messages[0].locale, 'en');
    assert.equal(page.data.messages[0].contentLocale, 'zh-CN');
    await page.send('chat', 'hello');
    assert.equal(calls[0].locale, 'en');
    assert.equal(page.data.messages.at(-2).contentLocale, 'en');
    assert.equal(page.data.messages.at(-1).contentLocale, 'en');
    i18n.setLocale('en');
    await page.send('chat', '这条记录缺少什么？');
    assert.equal(calls[1].locale, 'zh-CN');
    assert.equal(page.data.messages.at(-1).contentLocale, 'zh-CN');
    assert.equal(page.data.copy.aiChinese, 'Chinese Reply');
    assert.equal(conversations.load('r').messages.at(-1).locale, 'zh-CN');
    i18n.setLocale('zh-CN');
    assert.equal(page.data.messages[2].contentLocale, 'en');
    assert.equal(page.data.copy.aiEnglish, 'English Reply');
    assert.equal(page.data.copy.aiChinese, 'Chinese Reply');
  } finally {
    page.onUnload(); agent.getRecord = originalRead; wx.cloud.callFunction = originalCall;
  }
});

test('client rejects a stale cloud deployment returning the wrong reply language', async () => {
  reset(); i18n.setLocale('zh-CN');
  const originalCall = wx.cloud.callFunction;
  wx.cloud.callFunction = async () => ({ result: { success: true, recordId: 'r', locale: 'en', source: 'ai', isDemo: true, reply: '你好，我可以解读这条记录。', reportDraft: '', evidenceFields: [] } });
  try {
    await assert.rejects(() => agent.request({ recordId: 'r', action: 'chat', message: 'hello' }), error => error.code === 'AI_INVALID_OUTPUT');
  } finally { wx.cloud.callFunction = originalCall; }
});
