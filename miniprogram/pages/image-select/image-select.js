const store = require('../../utils/store');
const navigation = require('../../utils/navigation');

Page({
  data: {
    hasImage: false,
    imagePath: '',
    imageMeta: null
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

  chooseImage() {
    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['original', 'compressed'],
        success: (response) => {
          const file = response.tempFiles[0];
          this.readImage(file.tempFilePath, file.size || 0);
        }
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (response) => this.readImage(response.tempFilePaths[0], 0)
    });
  },

  readImage(path, byteSize) {
    wx.getImageInfo({
      src: path,
      success: (info) => {
        const extension = (info.type || path.split('.').pop() || 'jpg').toUpperCase();
        const imageMeta = {
          format: extension === 'JPEG' ? 'JPG' : extension,
          width: info.width,
          height: info.height,
          size: byteSize ? `${(byteSize / 1048576).toFixed(1)} MB` : '未知'
        };
        this.setData({ hasImage: true, imagePath: path, imageMeta });
        store.saveDraft({ imageTempPath: path, imageMeta });
        if (byteSize > 10485760) {
          wx.showToast({ title: '图片较大，正式上传前将进行压缩', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '无法读取这张图片，请重新选择', icon: 'none' })
    });
  },

  useDemoImage() {
    const imageMeta = { format: 'PNG', width: 1536, height: 1152, size: '2.1 MB' };
    this.setData({ hasImage: true, imagePath: store.DEMO_IMAGE, imageMeta });
    store.saveDraft({ imageTempPath: store.DEMO_IMAGE, imageMeta });
  },

  confirmImage() {
    if (!this.data.hasImage) return;
    navigation.navigateTo(this, '/pages/analyzing/analyzing');
  }
});
