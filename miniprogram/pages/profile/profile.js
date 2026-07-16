const store = require('../../utils/store');
const adaptiveTabbar = require('../../utils/adaptive-tabbar');

Page({
  data: {
    recordCount: 0,
    tabbarDocked: false
  },

  onShow() {
    this.setData({ recordCount: store.getRecords().length }, () => {
      adaptiveTabbar.scheduleMeasure(this, true);
    });
  },

  onReady() {
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  onPageScroll() {
    adaptiveTabbar.scheduleMeasure(this);
  },

  onReachBottom() {
    adaptiveTabbar.setDocked(this, true);
  },

  onResize() {
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  onUnload() {
    adaptiveTabbar.dispose(this);
  },

  openHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  },

  openAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  openPrivacy() {
    wx.navigateTo({ url: '/pages/about/about?section=privacy' });
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
        this.setData({ recordCount: 0 });
        wx.showToast({ title: '本地缓存已清理', icon: 'success' });
      }
    });
  }
});
