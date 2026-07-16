const adaptiveTabbar = require('../../utils/adaptive-tabbar');
const navigation = require('../../utils/navigation');

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
    navigation.navigateTo(this, '/pages/sample-form/sample-form');
  },

  openHistory() {
    navigation.redirectTo(this, '/pages/history/history');
  },

  openAbout() {
    navigation.navigateTo(this, '/pages/about/about');
  },

  openProfile() {
    navigation.redirectTo(this, '/pages/profile/profile');
  }
});
