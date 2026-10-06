const FIELD_NAMES = {
  sampleName: ['Sample', '样品'], note: ['Sample notes', '样品备注'],
  plateId: ['Plate ID', '孔板编号'], batchId: ['Batch', '实验批次'],
  operatorNote: ['Operator notes', '操作人员备注'],
  wellPosition: ['Well positions (not collected)', '孔位（未采集）'],
  experimentalConditions: ['Experimental conditions (not collected)', '实验条件（未采集）']
};
const RESULT_FIELDS = ['result.concentration', 'result.unit', 'result.rangeLabel', 'result.gradeCode', 'result.modelVersion', 'result.isDemo'];
const EVIDENCE_FIELDS = ['sampleName', 'note', 'plateId', 'batchId', 'operatorNote', 'createdAt'].concat(RESULT_FIELDS);
function language(locale) { return locale === 'zh-CN' ? 1 : 0; }
function disclaimer(locale) {
  return language(locale) ? '演示数据，不代表真实检测结论。暂无经验证的标准曲线、浓度换算、污染阈值或处理建议。' : 'Demo data, not a real detection result. No validated calibration, concentration conversion, pollution thresholds or treatment guidance are available.';
}
function sanitizeRecord(record) {
  const result = record.result || {};
  const clean = {};
  for (const key of ['sampleName', 'note', 'plateId', 'batchId', 'operatorNote']) clean[key] = String(record[key] || '').slice(0, 200);
  const date = record.createdAt && (record.createdAt.$date || record.createdAt);
  const parsed = new Date(date);
  clean.createdAt = Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  clean.result = {
    isDemo: true, pollutant: 'naphthalene',
    concentration: result.concentration, unit: result.unit,
    rangeLabel: result.rangeLabel, gradeCode: result.gradeCode,
    modelVersion: result.modelVersion
  };
  return clean;
}
function checkRecord(record) {
  return Object.keys(FIELD_NAMES).filter((field) => !String(record[field] || '').trim());
}
function projectContext(locale) {
  return {
    status: 'demo', isDemo: true,
    principle: language(locale)
      ? 'GlowLetter 展示萘污染荧光检测的产品构想：样品与工程菌、96 孔板、避光黑箱拍摄、记录展示。当前软件返回固定演示结果，选择不同图片不会产生真实浓度。'
      : 'GlowLetter demonstrates a naphthalene fluorescence workflow: samples and engineered bacteria, a 96-well plate, dark-box imaging and record display. The software returns fixed demo results; changing the image does not measure a real concentration.',
    limitations: disclaimer(locale)
  };
}
function reportDraft(record, locale) {
  const zh = language(locale);
  const missing = checkRecord(record);
  const noData = zh ? '未记录' : 'Not recorded';
  const lines = [zh ? 'GlowLetter · 报告草稿' : 'GlowLetter · Report draft', '', zh ? '记录信息' : 'Record information'];
  for (const field of ['sampleName', 'plateId', 'batchId', 'note', 'operatorNote']) {
    // User-authored notes are explicitly separated from validated measurement facts.
    lines.push(`${FIELD_NAMES[field][zh]}: ${record[field] || noData}`);
  }
  lines.push(`${zh ? '记录时间' : 'Recorded at'}: ${record.createdAt || noData}`, '', zh ? '检测结果' : 'Detection result');
  const result = record.result;
  lines.push(`${zh ? '浓度' : 'Concentration'}: ${result.concentration} ${result.unit}`);
  lines.push(`${zh ? '浓度区间' : 'Concentration range'}: ${result.rangeLabel}`);
  lines.push(`${zh ? '等级代码' : 'Grade code'}: ${result.gradeCode}`);
  lines.push(`${zh ? '模型版本' : 'Model version'}: ${result.modelVersion}`);
  lines.push('', zh ? '缺失信息' : 'Missing context', ...missing.map((key) => `• ${FIELD_NAMES[key][zh]}`));
  return lines.join('\n');
}
function validDemoResult(result) {
  return result && result.isDemo === true && Number.isFinite(result.concentration)
    && ['unit', 'rangeLabel', 'gradeCode', 'modelVersion'].every((key) => typeof result[key] === 'string' && result[key].length > 0 && result[key].length <= 100);
}
module.exports = { FIELD_NAMES, EVIDENCE_FIELDS, disclaimer, sanitizeRecord, checkRecord, projectContext, reportDraft, validDemoResult };
