const i18n = require('../utils/i18n');
const FRIENDLY_ERRORS = [
  { pattern: /network|request:fail|timeout/i, key: 'networkError' },
  { pattern: /-501005|function.*not.*exist/i, key: 'functionMissing' },
  { pattern: /-404011|非法的 env|invalid.*env/i, key: 'environmentError' },
  { pattern: /permission|auth|unauthorized|forbidden/i, key: 'permissionError' }
];

const ERROR_KEYS = {
  UNAUTHENTICATED: 'permissionError', INVALID_ID: 'recordMissing', NOT_FOUND: 'recordMissing',
  INVALID_SAMPLE_NAME: 'sampleNameValidation', INVALID_SAMPLE: 'aiInvalidRequest',
  INVALID_IMAGE_META: 'imageReadRetry', INVALID_FILE_ID: 'permissionError',
  INVALID_MODE: 'unsafeDemo', IMAGE_DELETE_FAILED: 'deleteError',
  AI_DISABLED: 'aiDisabled', AI_CONFIG_ERROR: 'aiDisabled', AI_TIMEOUT: 'aiTimeout',
  AI_UNAVAILABLE: 'aiUnavailable', AI_INVALID_OUTPUT: 'aiInvalidOutput',
  AI_INVALID_REQUEST: 'aiInvalidRequest', AI_DEMO_ONLY: 'aiDemoOnly',
  CLOUD_UNAVAILABLE: 'cloudUnavailable'
};

function createServiceError(error, fallbackMessage) {
  if (error && error.isServiceError) return error;
  const detail = error && (error.errMsg || error.message) ? (error.errMsg || error.message) : String(error || '');
  const matched = FRIENDLY_ERRORS.find((item) => item.pattern.test(detail));
  const code = error && (error.errCode || error.code) || 'CLOUD_SERVICE_ERROR';
  const key = ERROR_KEYS[code] || (matched && matched.key);
  const serviceError = new Error(key ? i18n.t(key) : (fallbackMessage || i18n.t('cloudError')));
  serviceError.code = code;
  serviceError.detail = detail;
  serviceError.isServiceError = true;
  return serviceError;
}

function ensureCloudReady() {
  const app = getApp();
  if (!app.globalData.cloudReady || !wx.cloud) {
    throw createServiceError(
      { code: 'CLOUD_UNAVAILABLE', message: app.globalData.cloudUnavailableReason },
      i18n.t('cloudUnavailable')
    );
  }
}

async function callFunction(name, data) {
  ensureCloudReady();
  try {
    const response = await wx.cloud.callFunction({ name, data: data || {} });
    const payload = response && response.result;
    if (!payload || payload.success === false) {
      throw createServiceError(payload && payload.error, i18n.t('invalidResponse'));
    }
    return payload;
  } catch (error) {
    throw createServiceError(error);
  }
}

module.exports = {
  callFunction,
  createServiceError,
  ensureCloudReady
};
