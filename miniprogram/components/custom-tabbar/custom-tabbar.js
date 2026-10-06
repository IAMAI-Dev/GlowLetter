const i18n = require('../../utils/i18n');
const TAB_KEYS = ['home', 'history', 'profile'];

i18n.component({
  properties: {
    active: { type: String, value: 'home' },
    docked: { type: Boolean, value: false }
  },

  methods: {
    handleSelect(event) {
      const key = event.currentTarget.dataset.key;
      if (!TAB_KEYS.includes(key) || key === this.properties.active) return;
      this.triggerEvent('select', { key });
    }
  }
});
