const adaptiveTabbar = require('../../utils/adaptive-tabbar');

Page({
  data: {
    statusBarHeight: getApp().globalData.layout.statusBarHeight,
    tabbarDocked: false
  },

  onReady() {
    adaptiveTabbar.scheduleMeasure(this, true);
  },

  onShow() {
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

  startDetection() {
    wx.navigateTo({ url: '/pages/sample-form/sample-form' });
  },

  openHistory() {
    wx.reLaunch({ url: '/pages/history/history' });
  },

  openAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  openProfile() {
    wx.reLaunch({ url: '/pages/profile/profile' });
  }
});
