const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

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

function isValidImageMeta(value) {
  if (!value || typeof value !== 'object') return false;
  const width = Number(value.width);
  const height = Number(value.height);
  const size = Number(value.size);
  const format = String(value.format || '').toUpperCase();
  return Number.isFinite(width)
    && Number.isFinite(height)
    && Number.isFinite(size)
    && width > 0
    && height > 0
    && size >= 0
    && width <= 50000
    && height <= 50000
    && size <= 50 * 1024 * 1024
    && ['JPG', 'JPEG', 'PNG'].includes(format);
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', '无法识别当前微信用户');
  if (!event || event.mode !== 'demo') return fail('INVALID_MODE', '当前只允许演示分析模式');
  const sampleName = String(event.sampleName || '').trim();
  if (!sampleName || sampleName.length > 40) return fail('INVALID_SAMPLE_NAME', '样品名称需为 1 至 40 个字符');
  if (!isValidImageMeta(event.imageMeta)) return fail('INVALID_IMAGE_META', '图片元数据无效');

  return { success: true, result: Object.assign({}, DEMO_RESULT) };
};
