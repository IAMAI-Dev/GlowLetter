const BOTTOM_THRESHOLD_PX = 12;
const UPDATE_DELAY_MS = 32;

function getWindowHeight() {
  if (typeof wx.getWindowInfo === 'function') {
    return wx.getWindowInfo().windowHeight || 0;
  }
  return wx.getSystemInfoSync().windowHeight || 0;
}

function setDocked(page, docked) {
  if (!page || !page.data || page.data.tabbarDocked === docked) return;
  page.setData({ tabbarDocked: docked });
}

function measure(page) {
  if (!page) return;
  wx.createSelectorQuery()
    .select(page.__adaptiveTabbarSelector || '.tab-page')
    .boundingClientRect((rect) => {
      if (!rect) return;
      const atBottom = rect.bottom <= getWindowHeight() + BOTTOM_THRESHOLD_PX;
      setDocked(page, atBottom);
    })
    .exec();
}

function scheduleMeasure(page, immediate) {
  if (!page) return;
  if (page.__adaptiveTabbarTimer) {
    clearTimeout(page.__adaptiveTabbarTimer);
    page.__adaptiveTabbarTimer = null;
  }

  if (immediate) {
    wx.nextTick(() => measure(page));
    return;
  }

  page.__adaptiveTabbarTimer = setTimeout(() => {
    page.__adaptiveTabbarTimer = null;
    measure(page);
  }, UPDATE_DELAY_MS);
}

function dispose(page) {
  if (!page || !page.__adaptiveTabbarTimer) return;
  clearTimeout(page.__adaptiveTabbarTimer);
  page.__adaptiveTabbarTimer = null;
}

module.exports = {
  dispose,
  scheduleMeasure,
  setDocked
};
