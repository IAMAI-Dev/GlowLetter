const ROUTES = {
  home: '/pages/home/home',
  history: '/pages/history/history',
  profile: '/pages/profile/profile'
};

Component({
  properties: {
    active: { type: String, value: 'home' }
  },

  methods: {
    handleSelect(event) {
      const key = event.currentTarget.dataset.key;
      if (!ROUTES[key] || key === this.properties.active) return;
      wx.reLaunch({ url: ROUTES[key] });
    }
  }
});
