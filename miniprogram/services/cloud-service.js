const FRIENDLY_ERRORS = [
  { pattern: /network|request:fail|timeout/i, message: '网络连接异常，请检查网络后重试。' },
  { pattern: /-501005|function.*not.*exist/i, message: '云函数尚未部署，请联系项目开发者。' },
  { pattern: /-404011|非法的 env|invalid.*env/i, message: '云开发环境未正确关联当前小程序。' },
  { pattern: /permission|auth|unauthorized|forbidden/i, message: '当前微信身份没有执行此操作的权限。' }
];

function createServiceError(error, fallbackMessage) {
  if (error && error.isServiceError) return error;
  const detail = error && (error.errMsg || error.message) ? (error.errMsg || error.message) : String(error || '');
  const matched = FRIENDLY_ERRORS.find((item) => item.pattern.test(detail));
  const serviceError = new Error(matched ? matched.message : (fallbackMessage || '云服务暂时不可用，请稍后重试。'));
  serviceError.code = error && (error.errCode || error.code) ? (error.errCode || error.code) : 'CLOUD_SERVICE_ERROR';
  serviceError.detail = detail;
  serviceError.isServiceError = true;
  return serviceError;
}

function ensureCloudReady() {
  const app = getApp();
  if (!app.globalData.cloudReady || !wx.cloud) {
    throw createServiceError(
      { code: 'CLOUD_UNAVAILABLE', message: app.globalData.cloudUnavailableReason },
      '当前设备无法连接微信云开发，请重试或进入离线演示。'
    );
  }
}

async function callFunction(name, data) {
  ensureCloudReady();
  try {
    const response = await wx.cloud.callFunction({ name, data: data || {} });
    const payload = response && response.result;
    if (!payload || payload.success === false) {
      throw createServiceError(payload && payload.error, '云端没有返回有效结果，请稍后重试。');
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
