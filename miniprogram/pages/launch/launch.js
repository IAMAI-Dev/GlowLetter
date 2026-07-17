const navigation = require('../../utils/navigation');
const authService = require('../../services/auth-service');
const configService = require('../../services/config-service');

Page({
  data: {
    statusText: '正在识别当前用户',
    hasError: false,
    initializing: false
  },

  onLoad() {
    this.startInitialization();
  },

  onUnload() {
    this.clearTimers();
  },

  clearTimers() {
    if (this.routeTimer) clearTimeout(this.routeTimer);
  },

  async startInitialization() {
    if (this.data.initializing) return;
    this.clearTimers();
    this.setData({ statusText: '正在识别当前用户', hasError: false, initializing: true });
    try {
      await authService.initialize();
      this.setData({ statusText: '正在读取云端配置' });
      try {
        await configService.getAppConfig();
      } catch (error) {
        console.warn('读取云端配置失败，使用安全默认配置。', error);
        getApp().globalData.appConfig = configService.getDefaultConfig();
      }
      this.setData({ statusText: '身份初始化完成' });
      this.routeTimer = setTimeout(() => {
        navigation.reLaunch(this, '/pages/home/home');
      }, 420);
    } catch (error) {
      console.warn('访客身份初始化失败。', error);
      this.setData({
        statusText: error.message || '身份初始化失败，请重试',
        hasError: true,
        initializing: false
      });
    }
  },

  handleRetry() {
    this.startInitialization();
  },

  enterDemo() {
    authService.enterOfflineDemo();
    getApp().globalData.appConfig = configService.getDefaultConfig();
    navigation.reLaunch(this, '/pages/home/home');
  }
});
