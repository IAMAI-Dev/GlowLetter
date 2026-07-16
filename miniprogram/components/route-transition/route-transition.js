const navigation = require('../../utils/navigation');

Component({
  properties: {
    active: { type: Boolean, value: false },
    tone: { type: String, value: 'light' }
  },

  pageLifetimes: {
    show() {
      navigation.reset(navigation.getCurrentPage());
    }
  },

  methods: {
    blockTouch() {}
  }
});
