const DRAFT_KEY = 'glowletter-draft';
const RECORDS_KEY = 'glowletter-records';
const PENDING_ANALYSIS_KEY = 'glowletter-pending-analysis';
const DEMO_IMAGE = '/assets/images/fluorescence-plate-demo.png';

const DEFAULT_DRAFT = {
  sampleName: '',
  note: '',
  plateId: '',
  batchId: '',
  operatorNote: '',
  imageTempPath: '',
  imageMeta: null
};

const DEFAULT_RESULT = {
  isDemo: true,
  pollutant: '萘',
  pollutantEn: 'naphthalene',
  concentration: 12.6,
  unit: 'mg/L',
  rangeLabel: '10–25 mg/L',
  gradeCode: 'B',
  gradeLabel: '轻度',
  suggestion: '当前为演示建议。真实处理方案待实验组确认。',
  retestRecommended: false,
  modelVersion: 'demo-v0.1'
};

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch (error) {
    console.warn(`读取本地数据失败：${key}`, error);
    return fallback;
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function getDraft() {
  return Object.assign({}, DEFAULT_DRAFT, read(DRAFT_KEY, {}));
}

function saveDraft(patch) {
  return write(DRAFT_KEY, Object.assign({}, getDraft(), patch));
}

function clearDraftImage() {
  return saveDraft({ imageTempPath: '', imageMeta: null });
}

function getDemoResult() {
  return Object.assign({}, DEFAULT_RESULT);
}

function getPendingAnalysis() {
  const result = read(PENDING_ANALYSIS_KEY, null);
  if (!result || result.isDemo !== true) return null;
  return Object.assign({}, result, { isDemo: true });
}

function savePendingAnalysis(result) {
  const normalized = Object.assign({}, DEFAULT_RESULT, result, { isDemo: true });
  return write(PENDING_ANALYSIS_KEY, normalized);
}

function clearPendingAnalysis() {
  wx.removeStorageSync(PENDING_ANALYSIS_KEY);
}

function getRecords() {
  const records = read(RECORDS_KEY, []);
  return Array.isArray(records) ? records : [];
}

function createRecord(payload) {
  const draft = Object.assign({}, getDraft(), payload && payload.draft);
  const result = Object.assign({}, DEFAULT_RESULT, payload && payload.result, { isDemo: true });
  const record = {
    id: `demo-${Date.now()}`,
    sampleName: draft.sampleName || 'A01',
    note: draft.note || '',
    plateId: draft.plateId || '',
    batchId: draft.batchId || '',
    operatorNote: draft.operatorNote || '',
    imagePath: draft.imageTempPath || DEMO_IMAGE,
    imageFileId: '',
    imageSource: draft.imageTempPath === DEMO_IMAGE ? 'demo-asset' : 'local-temp',
    storageSource: 'local',
    imageMeta: draft.imageMeta || {
      format: 'PNG',
      width: 1536,
      height: 1152,
      size: 2202009,
      sizeLabel: '2.1 MB'
    },
    result,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  const records = getRecords();
  write(RECORDS_KEY, [record].concat(records));
  return record;
}

function getRecord(id) {
  return getRecords().find((record) => record.id === id) || null;
}

function deleteRecord(id) {
  const records = getRecords().filter((record) => record.id !== id);
  write(RECORDS_KEY, records);
  return records;
}

function clearLocalData() {
  wx.removeStorageSync(DRAFT_KEY);
  wx.removeStorageSync(RECORDS_KEY);
  wx.removeStorageSync(PENDING_ANALYSIS_KEY);
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

module.exports = {
  DEMO_IMAGE,
  getDraft,
  saveDraft,
  clearDraftImage,
  getDemoResult,
  getPendingAnalysis,
  savePendingAnalysis,
  clearPendingAnalysis,
  getRecords,
  createRecord,
  getRecord,
  deleteRecord,
  clearLocalData,
  formatDate
};
