const i18n = require('../../utils/i18n');
const store = require('../../utils/store');
const navigation = require('../../utils/navigation');
const detectionService = require('../../services/detection-service');
const runtimeService = require('../../services/runtime-service');

i18n.page({
  data: {
    draft: store.getDraft(),
    result: detectionService.getPendingAnalysis(),
    imagePath: store.DEMO_IMAGE,
    timeLabel: i18n.t('justNow'),
    saved: false,
    savedRecordId: '',
    saving: false,
    saveError: '',
    dataSourceLabel: i18n.t('localSource')
  },

  onLoad() {
    const draft = store.getDraft();
    this.setData({
      draft,
      result: detectionService.getPendingAnalysis(),
      imagePath: draft.imageTempPath || store.DEMO_IMAGE,
      timeLabel: store.formatDate(new Date()),
      dataSourceLabel: runtimeService.isCloudMode() ? i18n.t('cloudSource') : i18n.t('localSource')
    });
  },

  handleNavbarAction() {
    navigation.navigateTo(this, '/pages/about/about');
  },

  async saveRecord() {
    if (this.data.savedRecordId) return this.data.savedRecordId;
    if (this.data.saving) return null;
    this.setData({ saving: true, saveError: '' });
    try {
      const record = await detectionService.createDetection({ draft: this.data.draft });
      this.setData({ saved: true, savedRecordId: record.id, saving: false });
      wx.showToast({ title: i18n.t('savedToast'), icon: 'success' });
      return record.id;
    } catch (error) {
      console.warn('保存演示记录失败。', error);
      this.setData({ saving: false, saveError: error.message || i18n.t('saveError') });
      return null;
    }
  },

  openAssistant() {
    if (this.data.saving) return;
    const open = (id) => navigation.navigateTo(this, `/pages/assistant/assistant?id=${encodeURIComponent(id)}`);
    if (this.data.savedRecordId) return open(this.data.savedRecordId);
    wx.showModal({
      title: i18n.t('aiSaveTitle'), content: i18n.t('aiSaveDescription'),
      confirmText: i18n.t('aiSaveConfirm'), cancelText: i18n.t('cancel'),
      success: async (response) => {
        if (!response.confirm) return;
        const id = await this.saveRecord();
        if (id) open(id);
      }
    });
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
