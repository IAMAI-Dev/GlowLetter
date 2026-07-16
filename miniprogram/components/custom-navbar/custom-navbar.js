const { getLayoutMetrics } = require('../../utils/layout');
const navigation = require('../../utils/navigation');

Component({
  properties: {
    title: { type: String, value: '' },
    dark: { type: Boolean, value: false },
    showBack: { type: Boolean, value: true },
    emitBack: { type: Boolean, value: false },
    backRoute: { type: String, value: '' },
    action: { type: String, value: '' },
    actionLabel: { type: String, value: '' }
  },

  data: {
    layout: getLayoutMetrics()
  },

  methods: {
    handleBack() {
      if (this.properties.emitBack) {
        this.triggerEvent('backrequest');
        return;
      }

      const currentPage = navigation.getCurrentPage();
      if (this.properties.backRoute) {
        navigation.backOrReset(currentPage, this.properties.backRoute);
        return;
      }

      const pages = getCurrentPages();
      if (pages.length > 1) {
        navigation.navigateBack(currentPage);
      } else {
        navigation.redirectTo(currentPage, '/pages/home/home');
      }
    },

    handleAction() {
      if (!this.properties.action) return;
      this.triggerEvent('action', { type: this.properties.action });
    }
  }
});
