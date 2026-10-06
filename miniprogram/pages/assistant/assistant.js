const i18n = require('../../utils/i18n');
const { detectLanguage } = require('../../utils/agent-language');
const agent = require('../../services/agent-service');
const conversations = require('../../utils/agent-store');
const runtime = require('../../services/runtime-service');
const navigation = require('../../utils/navigation');
const store = require('../../utils/store');
const { getLayoutMetrics } = require('../../utils/layout');

i18n.page({
  data: {
    record: null, timeLabel: '', loading: true, loadError: '', messages: [],
    reportDraft: '', reportLocale: 'en', input: '', busy: false, offline: false,
    enabled: false, providerLabel: '', error: '', cacheWarning: '', pendingQuestion: '',
    canRetry: false, lastMessageId: '', keyboardHeight: 0, inputHeight: 44, inputFocused: false,
    navHeight: getApp().globalData.layout.navTotalHeight
  },
  onLoad(options) {
    this.recordId = options.id || '';
    this.generation = 0;
    this.visible = true;
    this.loadRecord();
  },
  onShow() {
    this.visible = true;
    if (this.needsReload) { this.needsReload = false; this.loadRecord(); }
  },
  onHide() { this.invalidateRequest(); this.visible = false; this.needsReload = true; this.setData({ keyboardHeight: 0, inputFocused: false }); },
  onUnload() { this.invalidateRequest(); this.visible = false; },
  onResize() { this.setData({ navHeight: getLayoutMetrics().navTotalHeight }); },
  invalidateRequest() {
    this.generation += 1;
    if (this.data.busy) this.setData({ busy: false, error: i18n.t('aiStale'), canRetry: true });
  },
  async loadRecord() {
    const run = ++this.generation;
    this.lastRequest = null;
    this.setData({ loading: true, loadError: '', error: '', record: null, messages: [], reportDraft: '', enabled: false, cacheWarning: '', canRetry: false, pendingQuestion: '', busy: false });
    try {
      const record = await agent.getRecord(this.recordId);
      if (!this.visible || run !== this.generation) return;
      if (!record) {
        try { conversations.remove(this.recordId); } catch (error) { /* Stale cache remains inaccessible. */ }
        throw new Error(i18n.t('recordMissingHelp'));
      }
      let conversation;
      try { conversation = conversations.load(this.recordId); }
      catch (error) { throw new Error(i18n.t('aiStorageReadError')); }
      this.setData(Object.assign({}, conversation, {
        record, timeLabel: store.formatDate(record.createdAt), offline: !runtime.isCloudMode(), loading: false
      }));
      this.loaded = true;
      try {
        const availability = await agent.status();
        if (!this.visible || run !== this.generation) return;
        this.setData({ enabled: availability.enabled, providerLabel: availability.providerLabel || '' });
      } catch (error) {
        if (this.visible && run === this.generation) this.setData({ error: error.message, canRetry: false });
      }
    } catch (error) {
      if (this.visible && run === this.generation) this.setData({ loading: false, loadError: error.message || i18n.t('recordError') });
    }
  },
  onInput(event) {
    this.setData({ input: event.detail.value });
  },
  onInputFocus() { this.setData({ inputFocused: true }); },
  onInputLineChange(event) {
    this.setData({ inputHeight: Math.max(44, Math.min(132, Number(event.detail.height) || 44)) });
  },
  onKeyboardHeight(event) {
    const height = Math.max(0, Number(event.detail.height) || 0);
    if (height !== this.data.keyboardHeight) this.setData({ keyboardHeight: height });
  },
  onInputBlur() { this.setData({ inputFocused: false }); },
  runTask(event) {
    const action = event.currentTarget.dataset.action;
    const key = { explain: 'aiExplain', check: 'aiCheck', report: 'aiReport' }[action];
    if (key) this.send(action, i18n.t(key));
  },
  sendMessage() {
    const message = this.data.input.trim();
    if (message) this.send('chat', message);
  },
  async send(action, message, fallbackLocale) {
    if (this.data.busy || !this.data.record || this.data.loading || (!this.data.offline && !this.data.enabled)) return;
    if (!message || message.length > 1000) return;
    const run = ++this.generation;
    const locale = detectLanguage(message, fallbackLocale || i18n.getLocale());
    const source = this.data.offline ? 'offline-example' : 'ai';
    this.lastRequest = { action, message, locale };
    this.setData({ busy: true, error: '', canRetry: false, pendingQuestion: message, cacheWarning: '', lastMessageId: 'pending-message' });
    try {
      const response = await agent.request({ recordId: this.recordId, action, message, locale, messages: this.data.messages });
      if (!this.visible || run !== this.generation) return;
      const messages = this.data.messages.concat([
        { role: 'user', content: message, locale, source },
        { role: 'assistant', content: response.reply, locale: response.locale, source: response.source, evidenceFields: response.evidenceFields }
      ]).slice(-40);
      const conversation = {
        messages, reportDraft: response.reportDraft || this.data.reportDraft,
        reportLocale: response.reportDraft ? response.locale : this.data.reportLocale
      };
      this.setData(Object.assign({}, conversation, { busy: false, input: '', inputHeight: 44, pendingQuestion: '', lastMessageId: 'message-' + (messages.length - 1) }));
      try { conversations.save(this.recordId, conversation); }
      catch (error) { this.setData({ cacheWarning: i18n.t('aiStorageError') }); }
    } catch (error) {
      if (!this.visible || run !== this.generation) return;
      if (error.code === 'NOT_FOUND') {
        try { conversations.remove(this.recordId); } catch (storageError) { /* Do not display stale data. */ }
        this.setData({ record: null, messages: [], reportDraft: '', loadError: i18n.t('recordMissingHelp'), busy: false, pendingQuestion: '' });
      } else {
        this.setData({ busy: false, error: error.message || i18n.t('aiUnavailable'), canRetry: true });
      }
    }
  },
  retryRequest() {
    if (this.lastRequest) this.send(this.lastRequest.action, this.lastRequest.message, this.lastRequest.locale);
  },
  copyText(value) {
    if (!value) return;
    wx.setClipboardData({
      data: value,
      success: () => wx.showToast({ title: i18n.t('aiCopied'), icon: 'none' }),
      fail: () => wx.showToast({ title: i18n.t('aiCopyError'), icon: 'none' })
    });
  },
  copyMessage(event) {
    const message = this.data.messages[event.currentTarget.dataset.index];
    if (message) this.copyText(message.displayContent || message.content);
  },
  copyReport() { this.copyText(this.data.reportDraft); },
  clearConversation() {
    if (this.data.busy) return;
    wx.showModal({
      title: i18n.t('aiClearTitle'), content: i18n.t('aiClearDescription'),
      confirmText: i18n.t('confirmClear'), cancelText: i18n.t('cancel'),
      success: (response) => {
        if (!response.confirm) return;
        try {
          conversations.remove(this.recordId);
          this.lastRequest = null;
          this.setData({ messages: [], reportDraft: '', error: '', cacheWarning: '', canRetry: false, pendingQuestion: '' });
        } catch (error) { this.setData({ cacheWarning: i18n.t('localStorageError') }); }
      }
    });
  },
  returnHistory() { navigation.backOrReset(this, '/pages/home/home?tab=history'); }
});
