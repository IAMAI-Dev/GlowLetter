function getWindowInfo() {
  if (typeof wx.getWindowInfo === 'function') {
    return wx.getWindowInfo();
  }
  return wx.getSystemInfoSync();
}

function getLayoutMetrics() {
  const windowInfo = getWindowInfo();
  const statusBarHeight = windowInfo.statusBarHeight || 0;
  const windowWidth = windowInfo.windowWidth || 375;
  let menuButton = null;

  try {
    menuButton = wx.getMenuButtonBoundingClientRect();
  } catch (error) {
    menuButton = null;
  }

  if (!menuButton || !menuButton.height) {
    return {
      statusBarHeight,
      navContentHeight: 44,
      navTotalHeight: statusBarHeight + 44,
      capsuleSafeWidth: 96,
      windowWidth
    };
  }

  const verticalGap = Math.max(menuButton.top - statusBarHeight, 4);
  const navContentHeight = menuButton.height + verticalGap * 2;
  const capsuleSafeWidth = Math.max(windowWidth - menuButton.left + 8, 96);

  return {
    statusBarHeight,
    navContentHeight,
    navTotalHeight: statusBarHeight + navContentHeight,
    capsuleSafeWidth,
    windowWidth
  };
}

module.exports = { getLayoutMetrics };
