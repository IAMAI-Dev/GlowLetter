const i18n = require('../../utils/i18n');
const navigation = require('../../utils/navigation');
const store = require('../../utils/store');
const analysisAdapter = require('../../adapters/analysis-adapter');

i18n.page({
  data: {
    steps: [i18n.t('readingImage'), i18n.t('preparingDemo'), i18n.t('organizingResults'), i18n.t('resultsReady')],
    activeIndex: 0,
    hasError: false
  },

  onLoad() {
    this.startAnalysis();
  },

  onUnload() {
    this.analysisRunId = (this.analysisRunId || 0) + 1;
    this.clearTimers();
  },

  clearTimers() {
    (this.timers || []).forEach((timer) => clearTimeout(timer));
    this.timers = [];
    if (this.minimumDelayResolve) {
      this.minimumDelayResolve();
      this.minimumDelayResolve = null;
    }
  },

  async startAnalysis() {
    this.clearTimers();
    this.setData({ activeIndex: 0, hasError: false });
    const runId = (this.analysisRunId || 0) + 1;
    this.analysisRunId = runId;
    this.timers = this.data.steps.map((step, index) => setTimeout(() => {
      if (this.analysisRunId === runId) this.setData({ activeIndex: index });
    }, index * 380));

    const minimumDelay = new Promise((resolve) => {
      this.minimumDelayResolve = () => {
        this.minimumDelayResolve = null;
        resolve();
      };
      this.timers.push(setTimeout(this.minimumDelayResolve, 1640));
    });

    try {
      const draft = store.getDraft();
      await Promise.all([
        analysisAdapter.analyzeDetection({
          sampleName: draft.sampleName,
          imageMeta: draft.imageMeta,
          mode: 'demo'
        }),
        minimumDelay
      ]);
      if (this.analysisRunId !== runId) return;
      navigation.redirectTo(this, '/pages/result/result');
    } catch (error) {
      if (this.analysisRunId !== runId) return;
      console.warn('演示分析失败。', error);
      this.setData({ hasError: true });
    }
  },

  retryAnalysis() {
    this.startAnalysis();
  },

  returnToImage() {
    navigation.navigateBack(this);
  }
});
