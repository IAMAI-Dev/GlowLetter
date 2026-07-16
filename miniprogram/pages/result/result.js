const store = require('../../utils/store');

Page({
  data: {
    draft: store.getDraft(),
    result: store.getDemoResult(),
    imagePath: store.DEMO_IMAGE,
    timeLabel: '刚刚',
    saved: false
  },

  onLoad() {
    const draft = store.getDraft();
    this.setData({
      draft,
      imagePath: draft.imageTempPath || store.DEMO_IMAGE,
      timeLabel: store.formatDate(new Date())
    });
  },

  handleNavbarAction() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  saveRecord() {
    if (this.data.saved) return;
    store.createRecord({ draft: this.data.draft, result: this.data.result });
    this.setData({ saved: true });
    wx.showToast({ title: '演示记录已保存', icon: 'success' });
  },

  restartDetection() {
    store.clearDraftImage();
    wx.redirectTo({ url: '/pages/sample-form/sample-form' });
  },

  returnHome() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
