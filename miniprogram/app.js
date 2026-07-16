const { getLayoutMetrics } = require('./utils/layout');

App({
  globalData: {
    layout: getLayoutMetrics(),
    cloudReady: false
  },

  onLaunch() {
    if (!wx.cloud) return;

    try {
      wx.cloud.init({ traceUser: true });
      this.globalData.cloudReady = true;
    } catch (error) {
      console.warn('云开发初始化失败，当前继续使用本地演示模式。', error);
    }
  }
});
