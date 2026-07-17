const store = require('../../utils/store');
const navigation = require('../../utils/navigation');
const detectionService = require('../../services/detection-service');
const runtimeService = require('../../services/runtime-service');

Page({
  data: {
    draft: store.getDraft(),
    result: detectionService.getPendingAnalysis(),
    imagePath: store.DEMO_IMAGE,
    timeLabel: '刚刚',
    saved: false,
    saving: false,
    saveError: '',
    dataSourceLabel: '本地演示服务'
  },

  onLoad() {
    const draft = store.getDraft();
    this.setData({
      draft,
      result: detectionService.getPendingAnalysis(),
      imagePath: draft.imageTempPath || store.DEMO_IMAGE,
      timeLabel: store.formatDate(new Date()),
      dataSourceLabel: runtimeService.isCloudMode() ? '云端演示服务' : '本地演示服务'
    });
  },

  handleNavbarAction() {
    navigation.navigateTo(this, '/pages/about/about');
  },

  async saveRecord() {
    if (this.data.saved || this.data.saving) return;
    this.setData({ saving: true, saveError: '' });
    try {
      await detectionService.createDetection({ draft: this.data.draft });
      this.setData({ saved: true, saving: false });
      wx.showToast({ title: '演示记录已保存', icon: 'success' });
    } catch (error) {
      console.warn('保存演示记录失败。', error);
      this.setData({ saving: false, saveError: error.message || '保存失败，请重试' });
    }
  },

  restartDetection() {
    store.clearDraftImage();
    store.clearPendingAnalysis();
    navigation.redirectTo(this, '/pages/sample-form/sample-form');
  },

  returnHome() {
    navigation.reLaunch(this, '/pages/home/home');
  }
});
