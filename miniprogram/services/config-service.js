const cloudService = require('./cloud-service');
const runtimeService = require('./runtime-service');

const DEFAULT_CONFIG = {
  appNameZh: '绿荧来信',
  appNameEn: 'Glow Letter',
  mode: 'demo',
  demoModelVersion: 'demo-v0.1',
  uploadImageEnabled: true,
  historyEnabled: true,
  disclaimer: '当前为原型演示，结果由模拟数据生成。'
};

async function getAppConfig() {
  if (!runtimeService.isCloudMode()) {
    return runtimeService.setAppConfig(Object.assign({}, DEFAULT_CONFIG));
  }
  const response = await cloudService.callFunction('getAppConfig');
  return runtimeService.setAppConfig(Object.assign({}, DEFAULT_CONFIG, response.config));
}

function getDefaultConfig() {
  return Object.assign({}, DEFAULT_CONFIG);
}

module.exports = {
  getAppConfig,
  getDefaultConfig
};
