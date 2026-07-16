const store = require('../../utils/store');
const adaptiveTabbar = require('../../utils/adaptive-tabbar');
const navigation = require('../../utils/navigation');

const MAIN_TABS = ['home', 'history', 'profile'];

Page({
  data: {
    statusBarHeight: getApp().globalData.layout.statusBarHeight,
    activeTab: 'home',
    tabbarDocked: false,
    records: [],
    total: 0,
    visible: 5,
    hasMore: false,
    historyRefreshing: false,
    recordCount: 0
  },

  onLoad(options) {
    this.__adaptiveTabbarSelector = '.tab-page-active';
    if (MAIN_TABS.includes(options.tab)) {
      this.setData({ activeTab: options.tab });
    }
  },

  onShow() {
    this.refreshMainData(() => adaptiveTabbar.scheduleMeasure(this, true));
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
        this.refreshMainData(() => adaptiveTabbar.scheduleMeasure(this, true));
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

  refreshMainData(callback) {
    const allRecords = store.getRecords();
    const records = allRecords.slice(0, this.data.visible).map((record) => Object.assign({}, record, {
      timeLabel: store.formatDate(record.createdAt)
    }));
    this.setData({
      records,
      total: allRecords.length,
      hasMore: allRecords.length > records.length,
      recordCount: allRecords.length
    }, callback);
  },

  handleHistoryRefresh() {
    this.setData({ historyRefreshing: true });
    this.refreshMainData(() => {
      this.setData({ historyRefreshing: false });
      adaptiveTabbar.scheduleMeasure(this, true);
    });
  },

  handleNavbarAction() {
    this.refreshMainData(() => {
      adaptiveTabbar.scheduleMeasure(this, true);
      wx.showToast({ title: '历史记录已刷新', icon: 'none' });
    });
  },

  loadMore() {
    this.setData({ visible: this.data.visible + 5 }, () => {
      this.refreshMainData(() => adaptiveTabbar.scheduleMeasure(this, true));
    });
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
        this.setData({
          records: [],
          total: 0,
          visible: 5,
          hasMore: false,
          recordCount: 0
        });
        wx.showToast({ title: '本地缓存已清理', icon: 'success' });
      }
    });
  }
});
