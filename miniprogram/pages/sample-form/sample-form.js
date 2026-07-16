const store = require('../../utils/store');

Page({
  data: {
    draft: store.getDraft(),
    nameCount: 0,
    noteCount: 0,
    nameInvalid: false
  },

  onLoad() {
    const draft = store.getDraft();
    this.setData({
      draft,
      nameCount: draft.sampleName.length,
      noteCount: draft.note.length
    });
  },

  onUnload() {
    this.persistDraft();
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    const patch = { [`draft.${field}`]: value };
    if (field === 'sampleName') {
      patch.nameCount = value.length;
      if (value.trim()) patch.nameInvalid = false;
    }
    if (field === 'note') patch.noteCount = value.length;
    this.setData(patch, () => this.persistDraft());
  },

  persistDraft() {
    store.saveDraft(this.data.draft);
  },

  handleSubmit() {
    const sampleName = this.data.draft.sampleName.trim();
    if (!sampleName) {
      this.setData({ nameInvalid: true });
      wx.showToast({ title: '请填写样品名称', icon: 'none' });
      return;
    }

    const draft = Object.assign({}, this.data.draft, { sampleName });
    store.saveDraft(draft);
    this.setData({ draft, nameInvalid: false });
    wx.navigateTo({ url: '/pages/image-select/image-select' });
  }
});
