const i18n = require('./utils/i18n');
const { getLayoutMetrics } = require('./utils/layout');

App({
  globalData: {
    layout: getLayoutMetrics(),
    cloudReady: false,
    cloudUnavailableReason: '',
    runtimeMode: 'initializing',
    user: null,
    appConfig: null
  },

  onLaunch() {
    i18n.init();
    if (!wx.cloud) {
      this.globalData.cloudUnavailableReason = i18n.t('unsupportedCloud');
      return;
    }

    try {
      wx.cloud.init({ traceUser: true });
      this.globalData.cloudReady = true;
    } catch (error) {
      this.globalData.cloudUnavailableReason = i18n.t('cloudInitError');
      console.warn('云开发初始化失败，请在启动页重试或主动进入离线演示。', error);
    }
  }
});
