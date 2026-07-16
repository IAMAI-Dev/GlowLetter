Page({
  onLoad(options) {
    this.targetSection = options.section || '';
  },

  onReady() {
    if (this.targetSection !== 'privacy') return;
    setTimeout(() => {
      wx.pageScrollTo({ selector: '#privacy', duration: 280 });
    }, 60);
  },

  returnHome() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
