const i18n = require('../../utils/i18n');
const navigation = require('../../utils/navigation');
const authService = require('../../services/auth-service');
const configService = require('../../services/config-service');

i18n.page({
  data: {
    statusText: i18n.t('identifyUser'),
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
    this.setData({ statusText: i18n.t('identifyUser'), hasError: false, initializing: true });
    try {
      await authService.initialize();
      this.setData({ statusText: i18n.t('readConfig') });
      try {
        await configService.getAppConfig();
      } catch (error) {
        console.warn('读取云端配置失败，使用安全默认配置。', error);
        getApp().globalData.appConfig = configService.getDefaultConfig();
      }
      this.setData({ statusText: i18n.t('identityReady') });
      this.routeTimer = setTimeout(() => {
        navigation.reLaunch(this, '/pages/home/home');
      }, 420);
    } catch (error) {
      console.warn('访客身份初始化失败。', error);
      this.setData({
        statusText: error.message || i18n.t('identityError'),
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
