const store = require('../../utils/store');
const adaptiveTabbar = require('../../utils/adaptive-tabbar');
const navigation = require('../../utils/navigation');

Page({
  data: {
    records: [],
    total: 0,
    visible: 5,
    hasMore: false,
    tabbarDocked: false
  },

  onShow() {
    this.loadRecords();
  },

  onReady() {
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

  onPullDownRefresh() {
    this.setData({ visible: 5 }, () => {
      this.loadRecords();
      wx.stopPullDownRefresh();
    });
  },

  loadRecords(showToast) {
    const allRecords = store.getRecords();
    const records = allRecords.slice(0, this.data.visible).map((record) => Object.assign({}, record, {
      timeLabel: store.formatDate(record.createdAt)
    }));
    this.setData({
      records,
      total: allRecords.length,
      hasMore: allRecords.length > records.length
    }, () => adaptiveTabbar.scheduleMeasure(this, true));
    if (showToast) wx.showToast({ title: '历史记录已刷新', icon: 'none' });
  },

  handleNavbarAction() {
    this.loadRecords(true);
  },

  loadMore() {
    this.setData({ visible: this.data.visible + 5 }, () => this.loadRecords());
  },

  openDetail(event) {
    const id = event.currentTarget.dataset.id;
    navigation.navigateTo(this, `/pages/history-detail/history-detail?id=${encodeURIComponent(id)}`);
  },

  startDetection() {
    navigation.navigateTo(this, '/pages/sample-form/sample-form');
  }
});
