const LEAVE_DURATION_MS = 110;

const DARK_ROUTES = [
  '/pages/analyzing/analyzing',
  '/pages/launch/launch'
];

function getCurrentPage() {
  const pages = getCurrentPages();
  return pages[pages.length - 1] || null;
}

function getRouteTone(url) {
  const path = (url || '').split('?')[0];
  return DARK_ROUTES.includes(path) ? 'dark' : 'light';
}

function reset(page) {
  if (!page || (!page.__routeTransitioning && !page.data.routeTransitioning)) return;
  page.__routeTransitioning = false;
  page.setData({ routeTransitioning: false });
}

function run(page, routeMethod, options) {
  const targetPage = page || getCurrentPage();
  if (!targetPage || targetPage.__routeTransitioning) return;

  const routeOptions = Object.assign({}, options);
  const tone = routeOptions.tone || getRouteTone(routeOptions.url);
  const originalFail = routeOptions.fail;
  delete routeOptions.tone;

  targetPage.__routeTransitioning = true;
  targetPage.setData({
    routeTransitioning: true,
    routeTransitionTone: tone
  }, () => {
    targetPage.__routeTransitionTimer = setTimeout(() => {
      targetPage.__routeTransitionTimer = null;
      wx[routeMethod](Object.assign({}, routeOptions, {
        fail(error) {
          reset(targetPage);
          if (typeof originalFail === 'function') originalFail(error);
        }
      }));
    }, LEAVE_DURATION_MS);
  });
}

function navigateTo(page, url, options) {
  run(page, 'navigateTo', Object.assign({}, options, { url }));
}

function redirectTo(page, url, options) {
  run(page, 'redirectTo', Object.assign({}, options, { url }));
}

function reLaunch(page, url, options) {
  run(page, 'reLaunch', Object.assign({}, options, { url }));
}

function navigateBack(page, options) {
  run(page, 'navigateBack', Object.assign({ tone: 'light' }, options));
}

function backOrReset(page, url) {
  const pages = getCurrentPages();
  const previousPage = pages[pages.length - 2];
  const targetRoute = url.split('?')[0].replace(/^\//, '');
  if (previousPage && previousPage.route === targetRoute) {
    navigateBack(page);
    return;
  }
  if (pages.length > 1) {
    reLaunch(page, url);
    return;
  }
  redirectTo(page, url);
}

module.exports = {
  backOrReset,
  getCurrentPage,
  navigateBack,
  navigateTo,
  redirectTo,
  reset,
  reLaunch
};
