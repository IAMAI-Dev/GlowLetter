const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DEMO_RESULT = Object.freeze({
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
});

function fail(code, message) {
  return { success: false, error: { code, message } };
}

function normalizeText(value, maxLength) {
  const text = String(value || '').trim();
  return text.length <= maxLength ? text : null;
}

function normalizeImageMeta(value) {
  if (!value || typeof value !== 'object') return null;
  const source = value || {};
  const width = Number(source.width);
  const height = Number(source.height);
  const size = Number(source.size);
  const format = String(source.format || 'JPG').toUpperCase();
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(size)) return null;
  if (width <= 0 || height <= 0 || size < 0 || width > 50000 || height > 50000 || size > 50 * 1024 * 1024) return null;
  if (!['JPG', 'JPEG', 'PNG'].includes(format)) return null;
  return { width, height, size, format: format === 'JPEG' ? 'JPG' : format };
}

function isOwnedFileId(fileID, openid) {
  if (!fileID) return true;
  const owner = String(openid).replace(/[^a-zA-Z0-9_-]/g, '_');
  const ownedPath = new RegExp(`^cloud:\\/\\/[^/]+\\/detection-images\\/${owner}\\/\\d+-[a-z0-9]{8}\\.(?:jpg|png)$`);
  return ownedPath.test(fileID);
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', '无法识别当前微信用户');

  const sample = event && event.sample || {};
  const sampleName = normalizeText(sample.sampleName, 40);
  const note = normalizeText(sample.note, 200);
  const plateId = normalizeText(sample.plateId, 80);
  const batchId = normalizeText(sample.batchId, 80);
  const operatorNote = normalizeText(sample.operatorNote, 200);
  const imageMeta = normalizeImageMeta(event && event.imageMeta);
  const imageFileId = String(event && event.imageFileId || '');
  const imageSource = imageFileId ? 'cloud' : 'demo-asset';

  if (!sampleName) return fail('INVALID_SAMPLE_NAME', '样品名称需为 1 至 40 个字符');
  if ([note, plateId, batchId, operatorNote].some((value) => value === null)) return fail('INVALID_SAMPLE', '样品信息长度超出限制');
  if (!imageMeta) return fail('INVALID_IMAGE_META', '图片元数据无效');
  if (!isOwnedFileId(imageFileId, OPENID)) return fail('INVALID_FILE_ID', '图片文件不属于当前用户目录');

  const record = {
    _openid: OPENID,
    sampleName,
    note,
    plateId,
    batchId,
    operatorNote,
    imageFileId,
    imageSource,
    imageMeta,
    result: Object.assign({}, DEMO_RESULT),
    status: 'completed',
    createdAt: db.serverDate()
  };
  const added = await db.collection('detection_records').add({ data: record });

  return {
    success: true,
    record: Object.assign({}, record, {
      _id: added._id,
      id: added._id,
      createdAt: new Date().toISOString(),
      storageSource: 'cloud'
    })
  };
};
