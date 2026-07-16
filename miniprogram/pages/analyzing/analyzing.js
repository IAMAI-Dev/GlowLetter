Page({
  data: {
    steps: ['正在读取荧光图像', '正在识别孔板区域', '正在整理检测结果', '即将生成结果'],
    activeIndex: 0,
    hasError: false
  },

  onLoad() {
    this.startAnalysis();
  },

  onUnload() {
    this.clearTimers();
  },

  clearTimers() {
    (this.timers || []).forEach((timer) => clearTimeout(timer));
    this.timers = [];
  },

  startAnalysis() {
    this.clearTimers();
    this.setData({ activeIndex: 0, hasError: false });
    this.timers = this.data.steps.map((step, index) => setTimeout(() => {
      this.setData({ activeIndex: index });
    }, index * 380));
    this.timers.push(setTimeout(() => {
      wx.redirectTo({ url: '/pages/result/result' });
    }, 1640));
  },

  retryAnalysis() {
    this.startAnalysis();
  },

  returnToImage() {
    wx.navigateBack();
  }
});
