const runtime = require('../services/runtime-service');
const KEY = 'glowletter-ai-v1';
const MAX_BYTES = 1024 * 1024;
const MAX_MESSAGES = 40;

function namespace(recordId) {
  const user = runtime.getUser();
  const owner = runtime.isCloudMode() ? user && user.openid : 'offline-device';
  if (!owner) throw new Error('AI_STORAGE_IDENTITY');
  return JSON.stringify([runtime.getMode(), owner, recordId]);
}
function readAll() {
  const value = wx.getStorageSync(KEY);
  if (!value) return {};
  if (typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.entries)) throw new Error('AI_STORAGE_READ');
  const entries = {};
  value.entries.forEach((entry) => {
    if (!entry || typeof entry.key !== 'string' || !Array.isArray(entry.messages) || !Number.isFinite(entry.updatedAt)) throw new Error('AI_STORAGE_READ');
    entries[entry.key] = entry;
  });
  return entries;
}
function byteLength(value) {
  let length = 0;
  for (const char of JSON.stringify(value)) {
    const code = char.codePointAt(0);
    length += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return length;
}
function cleanMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('AI_STORAGE_READ');
  return messages.slice(-MAX_MESSAGES).map((message) => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string'
      || message.content.length > 5000 || !['en', 'zh-CN'].includes(message.locale)
      || !['ai', 'offline-example'].includes(message.source)) throw new Error('AI_STORAGE_READ');
    return {
      role: message.role, content: message.content, locale: message.locale, source: message.source,
      evidenceFields: Array.isArray(message.evidenceFields) ? message.evidenceFields.filter((field) => typeof field === 'string').slice(0, 20) : []
    };
  });
}
function load(recordId) {
  const entry = readAll()[namespace(recordId)];
  if (!entry) return { messages: [], reportDraft: '', reportLocale: 'en' };
  return {
    messages: cleanMessages(entry.messages),
    reportDraft: typeof entry.reportDraft === 'string' ? entry.reportDraft.slice(0, 12000) : '',
    reportLocale: entry.reportLocale === 'zh-CN' ? 'zh-CN' : 'en'
  };
}
function save(recordId, conversation) {
  const all = readAll();
  const key = namespace(recordId);
  all[key] = {
    key, messages: cleanMessages(conversation.messages),
    reportDraft: String(conversation.reportDraft || '').slice(0, 12000),
    reportLocale: conversation.reportLocale === 'zh-CN' ? 'zh-CN' : 'en', updatedAt: Date.now()
  };
  const entries = Object.values(all).sort((a, b) => a.updatedAt - b.updatedAt);
  // Keep the current entry on timestamp ties.
  const current = entries.splice(entries.findIndex((entry) => entry.key === key), 1)[0];
  entries.push(current);
  while (entries.length > 1 && byteLength({ version: 1, entries }) > MAX_BYTES) entries.shift();
  if (byteLength({ version: 1, entries }) > MAX_BYTES) throw new Error('AI_STORAGE_LIMIT');
  wx.setStorageSync(KEY, { version: 1, entries });
}
function remove(recordId) {
  const all = readAll();
  delete all[namespace(recordId)];
  wx.setStorageSync(KEY, { version: 1, entries: Object.values(all) });
}
function clearAll() { wx.removeStorageSync(KEY); }
module.exports = { load, save, remove, clearAll, MAX_BYTES, MAX_MESSAGES, byteLength };
