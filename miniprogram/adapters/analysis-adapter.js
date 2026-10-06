const i18n = require('../utils/i18n');
const store = require('../utils/store');
const cloudService = require('../services/cloud-service');
const runtimeService = require('../services/runtime-service');

async function analyzeDetection(input) {
  let result;
  if (runtimeService.isCloudMode()) {
    const response = await cloudService.callFunction('analyzeDemo', Object.assign({}, input, { mode: 'demo' }));
    result = response.result;
  } else {
    result = store.getDemoResult();
  }

  if (!result || result.isDemo !== true) {
    throw new Error(i18n.t('unsafeDemo'));
  }
  return store.savePendingAnalysis(result);
}

module.exports = { analyzeDetection };
