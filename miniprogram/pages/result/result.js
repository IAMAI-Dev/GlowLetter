const store = require('../../utils/store');
const navigation = require('../../utils/navigation');

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
    navigation.navigateTo(this, '/pages/about/about');
  },

  saveRecord() {
    if (this.data.saved) return;
    store.createRecord({ draft: this.data.draft, result: this.data.result });
    this.setData({ saved: true });
    wx.showToast({ title: '演示记录已保存', icon: 'success' });
  },

  restartDetection() {
    store.clearDraftImage();
    navigation.redirectTo(this, '/pages/sample-form/sample-form');
  },

  returnHome() {
    navigation.reLaunch(this, '/pages/home/home');
  }
});
