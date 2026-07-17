const store = require('../../utils/store');
const adaptiveTabbar = require('../../utils/adaptive-tabbar');
const navigation = require('../../utils/navigation');
const detectionService = require('../../services/detection-service');
const runtimeService = require('../../services/runtime-service');

const MAIN_TABS = ['home', 'history', 'profile'];

Page({
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
    identityLabel: '正在确认身份',
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
        identityLabel: cloudMode ? '云端身份已初始化' : '离线演示身份'
      });
      return true;
    } catch (error) {
      console.warn('读取历史记录失败。', error);
      this.setData({
        historyLoading: false,
        historyLoadingMore: false,
        historyError: error.message || '历史记录加载失败，请重试',
        cloudMode: runtimeService.isCloudMode(),
        identityLabel: runtimeService.isCloudMode() ? '云端身份已初始化' : '离线演示身份'
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
      wx.showToast({ title: '历史记录已刷新', icon: 'none' });
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

  clearCache() {
    wx.showModal({
      title: '清理本地缓存？',
      content: '这会移除当前设备中的表单草稿和演示历史记录，不影响任何真实云端数据。',
      confirmText: '确认清理',
      confirmColor: '#8c302d',
      success: (response) => {
        if (!response.confirm) return;
        store.clearLocalData();
        if (!runtimeService.isCloudMode()) {
          this.setData({ records: [], total: 0, page: 1, hasMore: false, recordCount: 0 });
        }
        wx.showToast({ title: '本地缓存已清理', icon: 'success' });
      }
    });
  }
});
