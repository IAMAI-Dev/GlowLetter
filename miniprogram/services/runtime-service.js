const CLOUD_MODE = 'cloud';
const OFFLINE_DEMO_MODE = 'offline-demo';

function getApplication() {
  return getApp();
}

function getMode() {
  return getApplication().globalData.runtimeMode;
}

function isCloudMode() {
  return getMode() === CLOUD_MODE;
}

function useCloud(user) {
  const app = getApplication();
  app.globalData.runtimeMode = CLOUD_MODE;
  app.globalData.user = user || null;
  return app.globalData.user;
}

function useOfflineDemo() {
  const app = getApplication();
  app.globalData.runtimeMode = OFFLINE_DEMO_MODE;
  app.globalData.user = {
    displayName: '离线演示访客',
    role: 'user',
    isOffline: true
  };
  return app.globalData.user;
}

function getUser() {
  return getApplication().globalData.user;
}

function setAppConfig(config) {
  getApplication().globalData.appConfig = config;
  return config;
}

function getAppConfig() {
  return getApplication().globalData.appConfig;
}

module.exports = {
  CLOUD_MODE,
  OFFLINE_DEMO_MODE,
  getMode,
  isCloudMode,
  useCloud,
  useOfflineDemo,
  getUser,
  setAppConfig,
  getAppConfig
};
