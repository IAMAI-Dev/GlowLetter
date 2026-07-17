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
    if (!wx.cloud) {
      this.globalData.cloudUnavailableReason = '当前微信基础库不支持云开发能力';
      return;
    }

    try {
      wx.cloud.init({ traceUser: true });
      this.globalData.cloudReady = true;
    } catch (error) {
      this.globalData.cloudUnavailableReason = '云开发初始化失败';
      console.warn('云开发初始化失败，请在启动页重试或主动进入离线演示。', error);
    }
  }
});
