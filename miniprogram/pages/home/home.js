Page({
  data: {
    statusBarHeight: getApp().globalData.layout.statusBarHeight
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
