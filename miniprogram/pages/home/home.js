const i18n = require('../../utils/i18n');
const store = require('../../utils/store');
const adaptiveTabbar = require('../../utils/adaptive-tabbar');
const navigation = require('../../utils/navigation');
const detectionService = require('../../services/detection-service');
const runtimeService = require('../../services/runtime-service');

const MAIN_TABS = ['home', 'history', 'profile'];

i18n.page({
  data: {
    statusBarHeight: getApp().globalData.layout.statusBarHeight,
    activeTab: 'home',
    tabbarDocked: false,
    records: [],
    total: 0,
    page: 1,
    hasMore: false,
    historyRefreshing: false,
    historyLoading: false,
    historyLoadingMore: false,
    historyError: '',
    recordCount: 0,
    identityLabel: i18n.t('confirmingIdentity'),
    cloudMode: false
  },

  onLoad(options) {
    this.__adaptiveTabbarSelector = '.tab-page-active';
    if (MAIN_TABS.includes(options.tab)) {
      this.setData({ activeTab: options.tab });
    }
  },

  onShow() {
    this.refreshMainData({ page: 1 }).finally(() => adaptiveTabbar.scheduleMeasure(this, true));
  },

  onReady() {
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  onResize() {
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  onUnload() {
    adaptiveTabbar.dispose(this);
  },

  handleTabChange(event) {
    this.switchMainTab(event.detail.key);
  },

  switchMainTab(key) {
    if (!MAIN_TABS.includes(key) || key === this.data.activeTab) return;
    this.setData({
      activeTab: key,
      tabbarDocked: false
    }, () => {
      if (key !== 'home') {
        this.refreshMainData({ page: 1 }).finally(() => adaptiveTabbar.scheduleMeasure(this, true));
        return;
      }
      adaptiveTabbar.scheduleMeasure(this, true);
    });
  },

  showHomeTab() {
    this.switchMainTab('home');
  },

  handleTabScroll() {
    adaptiveTabbar.scheduleMeasure(this);
  },

  handleTabScrollToLower() {
    adaptiveTabbar.setDocked(this, true);
  },

  async refreshMainData(options) {
    const page = options && options.page || 1;
    const append = Boolean(options && options.append);
    if (this.historyRequesting) return false;
    this.historyRequesting = true;
    this.setData({
      historyLoading: !append,
      historyLoadingMore: append,
      historyError: ''
    });

    try {
      const response = await detectionService.listDetections({ page, pageSize: 5 });
      const incoming = response.items.map((record) => Object.assign({}, record, {
        timeLabel: store.formatDate(record.createdAt)
      }));
      const records = append ? this.data.records.concat(incoming) : incoming;
      const cloudMode = runtimeService.isCloudMode();
      this.setData({
        records,
        total: response.total,
        page,
        hasMore: response.hasMore,
        recordCount: response.total,
        historyLoading: false,
        historyLoadingMore: false,
        cloudMode,
        identityLabel: cloudMode ? i18n.t('cloudIdentity') : i18n.t('offlineIdentity')
      });
      return true;
    } catch (error) {
      console.warn('读取历史记录失败。', error);
      this.setData({
        historyLoading: false,
        historyLoadingMore: false,
        historyError: error.message || i18n.t('historyError'),
        cloudMode: runtimeService.isCloudMode(),
        identityLabel: runtimeService.isCloudMode() ? i18n.t('cloudIdentity') : i18n.t('offlineIdentity')
      });
      return false;
    } finally {
      this.historyRequesting = false;
    }
  },

  async handleHistoryRefresh() {
    this.setData({ historyRefreshing: true });
    await this.refreshMainData({ page: 1 });
    this.setData({ historyRefreshing: false });
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  async handleNavbarAction() {
    const success = await this.refreshMainData({ page: 1 });
    adaptiveTabbar.scheduleMeasure(this, true);
    if (success) {
      wx.showToast({ title: i18n.t('historyRefreshed'), icon: 'none' });
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.historyLoadingMore) return;
    await this.refreshMainData({ page: this.data.page + 1, append: true });
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  openDetail(event) {
    const id = event.currentTarget.dataset.id;
    navigation.navigateTo(this, `/pages/history-detail/history-detail?id=${encodeURIComponent(id)}`);
  },

  startDetection() {
    navigation.navigateTo(this, '/pages/sample-form/sample-form');
  },

  openHistory() {
    this.switchMainTab('history');
  },

  openAbout() {
    navigation.navigateTo(this, '/pages/about/about');
  },

  openProfile() {
    this.switchMainTab('profile');
  },

  openPrivacy() {
    navigation.navigateTo(this, '/pages/about/about?section=privacy');
  },

  onLocaleChange() {
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  chooseLanguage() {
    wx.showActionSheet({
      itemList: ['English', '简体中文'],
      success: (response) => {
        try { i18n.setLocale(response.tapIndex === 1 ? 'zh-CN' : 'en'); }
        catch (error) { wx.showToast({ title: i18n.t('localStorageError'), icon: 'none' }); }
      }
    });
  },

  clearAiConversations() {
    wx.showModal({
      title: i18n.t('aiClearTitle'), content: i18n.t('aiClearDescription'),
      confirmText: i18n.t('confirmClear'), cancelText: i18n.t('cancel'),
      success: (response) => {
        if (!response.confirm) return;
        try {
          require('../../utils/agent-store').clearAll();
          wx.showToast({ title: i18n.t('aiCleared'), icon: 'none' });
        } catch (error) { wx.showToast({ title: i18n.t('localStorageError'), icon: 'none' }); }
      }
    });
  },

  clearCache() {
    wx.showModal({
      title: i18n.t('clearCacheTitle'),
      content: i18n.t('clearCacheDescription'),
      confirmText: i18n.t('confirmClear'),
      cancelText: i18n.t('cancel'),
      confirmColor: '#8c302d',
      success: (response) => {
        if (!response.confirm) return;
        try { store.clearLocalData(); }
        catch (error) { wx.showToast({ title: i18n.t('localStorageError'), icon: 'none' }); return; }
        if (!runtimeService.isCloudMode()) {
          this.setData({ records: [], total: 0, page: 1, hasMore: false, recordCount: 0 });
        }
        wx.showToast({ title: i18n.t('cacheCleared'), icon: 'success' });
      }
    });
  }
});
