const i18n = require('../../utils/i18n');
const store = require('../../utils/store');
const navigation = require('../../utils/navigation');
const detectionService = require('../../services/detection-service');

i18n.page({
  data: {
    hasRecord: false,
    record: null,
    timeLabel: '—',
    loading: true,
    loadError: '',
    deleting: false
  },

  onLoad(options) {
    this.recordId = options.id || '';
    this.loadRecord();
  },

  async loadRecord() {
    this.setData({ loading: true, loadError: '' });
    try {
      const record = this.recordId ? await detectionService.getDetection(this.recordId) : null;
      this.setData({
        hasRecord: Boolean(record),
        record: record || null,
        timeLabel: record ? store.formatDate(record.createdAt) : '—',
        loading: false
      });
    } catch (error) {
      console.warn('读取历史详情失败。', error);
      this.setData({
        hasRecord: false,
        record: null,
        loading: false,
        loadError: error.message || i18n.t('recordError')
      });
    }
  },

  handleNavbarAction() {
    this.confirmDelete();
  },

  confirmDelete() {
    if (!this.data.record || this.data.deleting) return;
    wx.showModal({
      title: i18n.t('deleteTitle'),
      content: i18n.t('deleteDescription'),
      confirmText: i18n.t('confirmDelete'),
      cancelText: i18n.t('cancel'),
      confirmColor: '#8c302d',
      success: async (response) => {
        if (!response.confirm) return;
        this.setData({ deleting: true });
        try {
          const result = await detectionService.deleteDetection(this.data.record.id);
          if (result.cacheClearFailed) wx.showToast({ title: i18n.t('aiDeleteCacheError'), icon: 'none' });
          navigation.backOrReset(this, '/pages/home/home?tab=history');
        } catch (error) {
          console.warn('删除历史记录失败。', error);
          this.setData({ deleting: false });
          wx.showToast({ title: error.message || i18n.t('deleteError'), icon: 'none' });
        }
      }
    });
  },

  reuseSample() {
    const record = this.data.record;
    if (!record) return;
    store.saveDraft({
      sampleName: record.sampleName,
      note: record.note || '',
      plateId: record.plateId || '',
      batchId: record.batchId || '',
      operatorNote: record.operatorNote || '',
      imageTempPath: '',
      imageMeta: null
    });
    navigation.navigateTo(this, '/pages/image-select/image-select');
  },

  openAssistant() {
    if (!this.data.record || this.data.deleting) return;
    navigation.navigateTo(this, `/pages/assistant/assistant?id=${encodeURIComponent(this.data.record.id)}`);
  },

  returnHistory() {
    navigation.backOrReset(this, '/pages/home/home?tab=history');
  },

  retryLoad() {
    this.loadRecord();
  }
});
