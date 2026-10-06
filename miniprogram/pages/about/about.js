const i18n = require('../../utils/i18n');
const navigation = require('../../utils/navigation');

i18n.page({
  onLoad(options) {
    this.targetSection = options.section || '';
  },

  onReady() {
    if (this.targetSection !== 'privacy') return;
    setTimeout(() => {
      wx.pageScrollTo({ selector: '#privacy', duration: 280 });
    }, 60);
  },

  returnHome() {
    navigation.reLaunch(this, '/pages/home/home');
  }
});
