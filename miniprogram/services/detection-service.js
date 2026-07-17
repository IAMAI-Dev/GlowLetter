const store = require('../utils/store');
const cloudService = require('./cloud-service');
const runtimeService = require('./runtime-service');
const storageService = require('./storage-service');

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 20;

function normalizePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizePageSize(value) {
  const pageSize = Number(value);
  if (!Number.isInteger(pageSize) || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function normalizeImageMeta(imageMeta) {
  const source = imageMeta || {};
  return {
    width: Math.max(0, Number(source.width) || 0),
    height: Math.max(0, Number(source.height) || 0),
    format: String(source.format || 'JPG').toUpperCase(),
    size: Math.max(0, Number(source.size) || 0)
  };
}

function normalizeRecord(record) {
  if (!record) return null;
  return Object.assign({}, record, {
    id: record.id || record._id,
    storageSource: record.storageSource || 'cloud',
    imagePath: record.imagePath || (!record.imageFileId ? store.DEMO_IMAGE : ''),
    dataSourceLabel: record.storageSource === 'local' ? '本地演示服务' : '云端演示服务'
  });
}

async function createDetection(input) {
  const draft = Object.assign({}, store.getDraft(), input && input.draft);
  const pendingResult = store.getPendingAnalysis() || store.getDemoResult();

  if (!runtimeService.isCloudMode()) {
    return normalizeRecord(store.createRecord({ draft, result: pendingResult }));
  }

  const user = runtimeService.getUser() || {};
  const config = runtimeService.getAppConfig() || {};
  let upload = { imageFileId: '', imageSource: 'demo-asset', uploaded: false };

  if (config.uploadImageEnabled !== false) {
    upload = await storageService.uploadDetectionImage({
      filePath: draft.imageTempPath,
      imageMeta: draft.imageMeta,
      openid: user.openid
    });
  }

  try {
    const response = await cloudService.callFunction('createDetection', {
      sample: {
        sampleName: draft.sampleName,
        note: draft.note,
        plateId: draft.plateId,
        batchId: draft.batchId,
        operatorNote: draft.operatorNote
      },
      imageFileId: upload.imageFileId,
      imageSource: upload.imageSource,
      imageMeta: normalizeImageMeta(draft.imageMeta)
    });
    return normalizeRecord(response.record);
  } catch (error) {
    if (upload.uploaded) await storageService.removeUploadedFile(upload.imageFileId);
    throw error;
  }
}

async function listDetections(options) {
  const page = normalizePage(options && options.page);
  const pageSize = normalizePageSize(options && options.pageSize);

  if (!runtimeService.isCloudMode()) {
    const records = store.getRecords();
    const start = (page - 1) * pageSize;
    const items = records.slice(start, start + pageSize).map(normalizeRecord);
    return {
      items,
      total: records.length,
      hasMore: start + items.length < records.length,
      page,
      pageSize
    };
  }

  const response = await cloudService.callFunction('listDetections', { page, pageSize });
  return Object.assign({}, response, {
    items: (response.items || []).map(normalizeRecord),
    page,
    pageSize
  });
}

async function getDetection(id) {
  if (!runtimeService.isCloudMode()) {
    return normalizeRecord(store.getRecord(id));
  }
  const response = await cloudService.callFunction('getDetection', { id });
  const record = normalizeRecord(response.record);
  if (!record) return null;
  record.imagePath = await storageService.resolveImagePath(record);
  return record;
}

async function deleteDetection(id) {
  if (!runtimeService.isCloudMode()) {
    store.deleteRecord(id);
    return { deleted: true };
  }
  return cloudService.callFunction('deleteDetection', { id });
}

function getPendingAnalysis() {
  return store.getPendingAnalysis() || store.getDemoResult();
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  createDetection,
  listDetections,
  getDetection,
  deleteDetection,
  getPendingAnalysis,
  normalizeImageMeta,
  normalizeRecord
};
