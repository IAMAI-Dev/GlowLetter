const store = require('../../utils/store');
const navigation = require('../../utils/navigation');
const imageSourceAdapter = require('../../adapters/image-source-adapter');

Page({
  data: {
    hasImage: false,
    imagePath: '',
    imageMeta: null,
    selecting: false
  },

  onLoad() {
    const draft = store.getDraft();
    if (draft.imageTempPath && draft.imageMeta) {
      this.setData({
        hasImage: true,
        imagePath: draft.imageTempPath,
        imageMeta: draft.imageMeta
      });
    }
  },

  async chooseImage() {
    if (this.data.selecting) return;
    this.setData({ selecting: true });
    try {
      const selected = await imageSourceAdapter.getImage();
      this.setData({ hasImage: true, imagePath: selected.path, imageMeta: selected.imageMeta });
      store.saveDraft({ imageTempPath: selected.path, imageMeta: selected.imageMeta });
      if (selected.imageMeta.size > 10485760) {
        wx.showToast({ title: '图片较大，上传可能需要较长时间', icon: 'none' });
      }
    } catch (error) {
      if (error.code !== 'CHOOSE_CANCELLED') {
        wx.showToast({ title: error.message || '无法读取这张图片', icon: 'none' });
      }
    } finally {
      this.setData({ selecting: false });
    }
  },

  useDemoImage() {
    const imageMeta = { format: 'PNG', width: 1536, height: 1152, size: 2202009, sizeLabel: '2.1 MB' };
    this.setData({ hasImage: true, imagePath: store.DEMO_IMAGE, imageMeta });
    store.saveDraft({ imageTempPath: store.DEMO_IMAGE, imageMeta });
  },

  confirmImage() {
    if (!this.data.hasImage) return;
    navigation.navigateTo(this, '/pages/analyzing/analyzing');
  }
});
