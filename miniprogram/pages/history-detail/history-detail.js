const store = require('../../utils/store');
const navigation = require('../../utils/navigation');
const detectionService = require('../../services/detection-service');

Page({
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
        loadError: error.message || '记录暂时无法读取，请重试'
      });
    }
  },

  handleNavbarAction() {
    this.confirmDelete();
  },

  confirmDelete() {
    if (!this.data.record || this.data.deleting) return;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。云端记录会连同关联图片一并删除；离线演示记录只会从本机删除。',
      confirmText: '确认删除',
      confirmColor: '#8c302d',
      success: async (response) => {
        if (!response.confirm) return;
        this.setData({ deleting: true });
        try {
          await detectionService.deleteDetection(this.data.record.id);
          navigation.backOrReset(this, '/pages/home/home?tab=history');
        } catch (error) {
          console.warn('删除历史记录失败。', error);
          this.setData({ deleting: false });
          wx.showToast({ title: error.message || '删除失败，请重试', icon: 'none' });
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

  returnHistory() {
    navigation.backOrReset(this, '/pages/home/home?tab=history');
  },

  retryLoad() {
    this.loadRecord();
  }
});
