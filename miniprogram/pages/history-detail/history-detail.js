const store = require('../../utils/store');
const navigation = require('../../utils/navigation');

Page({
  data: {
    hasRecord: false,
    record: null,
    timeLabel: '—'
  },

  onLoad(options) {
    this.recordId = options.id || '';
    this.loadRecord();
  },

  loadRecord() {
    const records = store.getRecords();
    const record = this.recordId ? store.getRecord(this.recordId) : records[0];
    this.setData({
      hasRecord: Boolean(record),
      record: record || null,
      timeLabel: record ? store.formatDate(record.createdAt) : '—'
    });
  },

  handleNavbarAction() {
    this.confirmDelete();
  },

  confirmDelete() {
    if (!this.data.record) return;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。当前只会清除本机保存的这条演示记录。',
      confirmText: '确认删除',
      confirmColor: '#8c302d',
      success: (response) => {
        if (!response.confirm) return;
        store.deleteRecord(this.data.record.id);
        navigation.backOrReset(this, '/pages/home/home?tab=history');
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
  }
});
