const cloud = require('./cloud-service');
const runtime = require('./runtime-service');
const detection = require('./detection-service');
const i18n = require('../utils/i18n');
const { detectLanguage } = require('../utils/agent-language');

function boundedHistory(messages) {
  const recent = [];
  let size = 0;
  for (let index = messages.length - 1; index >= 0 && recent.length < 12; index -= 1) {
    const item = messages[index];
    if (!['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    const content = item.content.slice(0, 5000);
    if (size + content.length > 16000) break;
    size += content.length;
    recent.unshift({ role: item.role, content });
  }
  while (recent.length && recent[0].role !== 'user') recent.shift();
  return recent;
}
function withDeadline(promise, milliseconds) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(cloud.createServiceError({ code: 'AI_TIMEOUT' })), milliseconds);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
async function status() {
  if (!runtime.isCloudMode()) return { enabled: false, offline: true, providerLabel: '' };
  return withDeadline(cloud.callFunction('explainDetection', { action: 'status' }), 15000);
}
async function getRecord(recordId) {
  // Assistant access does not need to resolve or transmit private image URLs.
  if (!runtime.isCloudMode()) return detection.getDetection(recordId);
  const response = await withDeadline(cloud.callFunction('getDetection', { id: recordId }), 15000);
  return response.record ? detection.normalizeRecord(response.record) : null;
}

function offlineExample(record, action, locale) {
  const zh = locale === 'zh-CN';
  const labels = {
    sampleName: zh ? '样品' : 'Sample', plateId: zh ? '孔板编号' : 'Plate ID',
    batchId: zh ? '实验批次' : 'Batch', note: zh ? '样品备注' : 'Sample notes',
    operatorNote: zh ? '操作人员备注' : 'Operator notes',
    wellPosition: zh ? '孔位（未采集）' : 'Well positions (not collected)',
    experimentalConditions: zh ? '实验条件（未采集）' : 'Experimental conditions (not collected)'
  };
  const missingFields = Object.keys(labels).filter((field) => !String(record[field] || '').trim());
  const missingText = missingFields.map((field) => labels[field]).join(zh ? '、' : ', ');
  const banner = i18n.t('aiOffline', locale);
  let reply = zh
    ? '记录包含样品信息、浓度、区间与等级。你可以检查缺失信息，或生成报告草稿。'
    : 'The record contains sample information, concentration, range and grade. You can check missing context or create a report draft.';
  if (action === 'check') reply = (zh ? '尚缺少：' : 'Missing context: ') + missingText + (zh ? '。缺失内容需要记录人员补充，助手不会自行推断。' : '. These details need to be supplied by the record author; the assistant does not infer them.');
  if (action === 'report') reply = zh ? '下方草稿由固定模板和本机记录生成，可以复制。' : 'The draft below uses a fixed template and your local record. You can copy it.';
  const result = record.result;
  const lines = [i18n.t('aiReportLabel', locale), banner, '', i18n.t('recordInfo', locale)];
  for (const field of ['sampleName', 'plateId', 'batchId', 'note', 'operatorNote']) lines.push(`${labels[field]}: ${record[field] || (zh ? '未记录' : 'Not recorded')}`);
  lines.push(`${zh ? '记录时间' : 'Recorded at'}: ${record.createdAt || '—'}`, '', `${i18n.t('simulatedConcentration', locale)}: ${result.concentration} ${result.unit}`);
  lines.push(`${i18n.t('simulatedRange', locale)}: ${result.rangeLabel}`, `${i18n.t('pollutionGrade', locale)}: ${result.gradeCode}`, `${i18n.t('modelVersion', locale)}: ${result.modelVersion}`);
  lines.push('', i18n.t('aiMissing', locale), missingText);
  return {
    success: true, recordId: record.id, locale, source: 'offline-example', isDemo: true,
    reply: banner + '\n\n' + reply, reportDraft: action === 'report' ? lines.join('\n') : '',
    missingFields, evidenceFields: ['sampleName', 'result.isDemo', 'result.modelVersion']
  };
}
async function request(options) {
  const locale = detectLanguage(options.message, options.locale || i18n.getLocale());
  if (!runtime.isCloudMode()) {
    if (!['explain', 'check', 'report'].includes(options.action)) throw new Error(i18n.t('aiOfflineHelp'));
    const record = await getRecord(options.recordId);
    if (!record) throw cloud.createServiceError({ code: 'NOT_FOUND' });
    if (!record.result || record.result.isDemo !== true) throw cloud.createServiceError({ code: 'AI_DEMO_ONLY' });
    return offlineExample(record, options.action, locale);
  }
  const response = await withDeadline(cloud.callFunction('explainDetection', {
    recordId: options.recordId, locale, action: options.action,
    message: options.message || '', history: boundedHistory(options.messages || [])
  }), 55000);
  if (response.isDemo !== true || response.source !== 'ai' || response.recordId !== options.recordId
    || response.locale !== locale || typeof response.reply !== 'string' || !response.reply
    || response.reply.length > 5000 || typeof response.reportDraft !== 'string' || response.reportDraft.length > 12000) {
    throw cloud.createServiceError({ code: 'AI_INVALID_OUTPUT' });
  }
  if (detectLanguage(response.reply, locale) !== locale) throw cloud.createServiceError({ code: 'AI_INVALID_OUTPUT' });
  return response;
}
module.exports = { status, getRecord, request, offlineExample, boundedHistory, withDeadline };
