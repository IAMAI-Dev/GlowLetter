const { getLayoutMetrics } = require('../../utils/layout');

Component({
  properties: {
    title: { type: String, value: '' },
    dark: { type: Boolean, value: false },
    showBack: { type: Boolean, value: true },
    backRoute: { type: String, value: '' },
    action: { type: String, value: '' },
    actionLabel: { type: String, value: '' }
  },

  data: {
    layout: getLayoutMetrics()
  },

  methods: {
    handleBack() {
      if (this.properties.backRoute) {
        wx.reLaunch({ url: this.properties.backRoute });
        return;
      }

      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.reLaunch({ url: '/pages/home/home' });
      }
    },

    handleAction() {
      if (!this.properties.action) return;
      this.triggerEvent('action', { type: this.properties.action });
    }
  }
});
