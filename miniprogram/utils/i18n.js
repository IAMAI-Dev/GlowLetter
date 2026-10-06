const messages = require('../i18n/messages');
const { detectLanguage } = require('./agent-language');
const LOCALE_KEY = 'glowletter-locale';
const listeners = new Set();
let locale = 'en';
const reverse = {};
Object.keys(messages).forEach((key) => messages[key].forEach((value) => { reverse[value] = key; }));

function init() {
  try { locale = wx.getStorageSync(LOCALE_KEY) === 'zh-CN' ? 'zh-CN' : 'en'; }
  catch (error) { locale = 'en'; }
  return locale;
}

function getLocale() { return locale; }
function t(key, language) {
  const entry = messages[key];
  return entry ? entry[(language || locale) === 'zh-CN' ? 1 : 0] : messages.unknown[(language || locale) === 'zh-CN' ? 1 : 0];
}
function copy() {
  const result = {};
  Object.keys(messages).forEach((key) => { result[key] = t(key); });
  return result;
}
function translateKnown(value) { return reverse[value] ? t(reverse[value]) : value; }
function setLocale(value) {
  const next = value === 'zh-CN' ? 'zh-CN' : 'en';
  // Persist first: a failed write must not claim the preference was saved.
  wx.setStorageSync(LOCALE_KEY, next);
  locale = next;
  listeners.forEach((listener) => listener());
}

function resultView(result) {
  if (!result) return null;
  const knownDemo = result.isDemo === true && result.modelVersion === 'demo-v0.1';
  return {
    pollutant: knownDemo ? t('pollutant') : (result.pollutantEn || t('unknown')),
    gradeLabel: knownDemo && result.gradeCode === 'B' ? t('mild') : t('unknown'),
    suggestion: t('demoSuggestion')
  };
}
function recordView(record) {
  if (!record) return null;
  return Object.assign({}, record, {
    resultView: resultView(record.result),
    dataSourceLabel: t(record.storageSource === 'local' ? 'localSource' : 'cloudSource')
  });
}
const EVIDENCE_LABELS = {
  sampleName: 'sampleName', note: 'sampleNote', plateId: 'plateId', batchId: 'batchId', operatorNote: 'operatorNote',
  createdAt: 'recordedAt', 'result.concentration': 'simulatedConcentration', 'result.unit': 'simulatedConcentration',
  'result.rangeLabel': 'simulatedRange', 'result.gradeCode': 'pollutionGrade', 'result.modelVersion': 'modelVersion'
};
const LEGACY_REPLY_PREFIXES = [
  '演示数据，不代表真实检测结论。暂无经验证的标准曲线、浓度换算、污染阈值或处理建议。',
  'Demo data, not a real detection result. No validated calibration, concentration conversion, pollution thresholds or treatment guidance are available.'
];
function displayMessage(message) {
  let content = message.content;
  // Hide only the old application-added prefix; retain the original saved text.
  if (message.role === 'assistant' && message.source === 'ai' && typeof content === 'string') {
    const prefix = LEGACY_REPLY_PREFIXES.find((value) => content.startsWith(value + '\n\n'));
    if (prefix) content = content.slice(prefix.length).trimStart();
  }
  return content;
}
const DYNAMIC_TEXT = ['statusText', 'identityLabel', 'dataSourceLabel', 'timeLabel', 'historyError', 'saveError', 'loadError', 'error', 'cacheWarning'];
function decorate(patch) {
  const result = Object.assign({}, patch);
  if (Object.prototype.hasOwnProperty.call(result, 'result')) result.resultView = resultView(result.result);
  if (Object.prototype.hasOwnProperty.call(result, 'record')) result.record = recordView(result.record);
  if (Array.isArray(result.records)) result.records = result.records.map(recordView);
  if (Array.isArray(result.messages)) result.messages = result.messages.map((message, index) => Object.assign({}, message, {
    index,
    displayContent: displayMessage(message),
    contentLocale: detectLanguage(displayMessage(message), message.locale),
    evidenceLabel: Array.from(new Set((message.evidenceFields || []).filter((field) => EVIDENCE_LABELS[field]).map((field) => t(EVIDENCE_LABELS[field])))).join(locale === 'en' ? ', ' : '、')
  }));
  DYNAMIC_TEXT.forEach((key) => {
    if (typeof result[key] === 'string') result[key] = translateKnown(result[key]);
  });
  if (Array.isArray(result.steps)) result.steps = result.steps.map(translateKnown);
  return result;
}
function refresh(instance) {
  const patch = { copy: copy(), locale };
  ['result', 'record', 'records', 'steps', 'messages'].concat(DYNAMIC_TEXT).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(instance.data, key)) patch[key] = instance.data[key];
  });
  instance.setData(decorate(patch));
  if (instance.onLocaleChange) instance.onLocaleChange();
}

function page(definition) {
  const load = definition.onLoad;
  const show = definition.onShow;
  const unload = definition.onUnload;
  return Page(Object.assign({}, definition, {
    data: Object.assign({}, definition.data, { copy: copy(), locale }),
    onLoad(options) {
      const setData = this.setData.bind(this);
      this.setData = (patch, callback) => setData(decorate(patch), callback);
      this.__localeListener = () => refresh(this);
      listeners.add(this.__localeListener);
      refresh(this);
      if (load) return load.call(this, options || {});
    },
    onShow() {
      refresh(this);
      if (show) return show.call(this);
    },
    onUnload() {
      listeners.delete(this.__localeListener);
      if (unload) return unload.call(this);
    }
  }));
}

function component(definition) {
  const lifetimes = definition.lifetimes || {};
  return Component(Object.assign({}, definition, {
    data: Object.assign({}, definition.data, { copy: copy(), locale }),
    lifetimes: Object.assign({}, lifetimes, {
      attached() {
        this.__localeListener = () => this.setData({ copy: copy(), locale });
        listeners.add(this.__localeListener);
        this.__localeListener();
        if (lifetimes.attached) lifetimes.attached.call(this);
      },
      detached() {
        listeners.delete(this.__localeListener);
        if (lifetimes.detached) lifetimes.detached.call(this);
      }
    })
  }));
}

module.exports = { init, getLocale, setLocale, t, copy, translateKnown, resultView, recordView, page, component };
