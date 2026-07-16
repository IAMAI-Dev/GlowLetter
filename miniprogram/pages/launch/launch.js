Page({
  data: {
    statusText: '正在识别当前用户',
    hasError: false
  },

  onLoad() {
    this.startInitialization();
  },

  onUnload() {
    this.clearTimers();
  },

  clearTimers() {
    if (this.readyTimer) clearTimeout(this.readyTimer);
    if (this.routeTimer) clearTimeout(this.routeTimer);
  },

  startInitialization() {
    this.clearTimers();
    this.setData({ statusText: '正在识别当前用户', hasError: false });
    this.readyTimer = setTimeout(() => {
      this.setData({ statusText: '身份初始化完成' });
      this.routeTimer = setTimeout(() => {
        wx.reLaunch({ url: '/pages/home/home' });
      }, 420);
    }, 760);
  },

  handleRetry() {
    this.startInitialization();
  },

  enterDemo() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
