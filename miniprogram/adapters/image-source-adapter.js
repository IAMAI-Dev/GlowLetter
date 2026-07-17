function formatByteSize(byteSize) {
  const size = Number(byteSize) || 0;
  if (!size) return '未知';
  return `${(size / 1048576).toFixed(1)} MB`;
}

function chooseRawImage() {
  return new Promise((resolve, reject) => {
    const fail = (error) => {
      const message = error && error.errMsg || '';
      const normalized = new Error(/cancel/i.test(message) ? '已取消选择图片' : '无法选择这张图片');
      normalized.code = /cancel/i.test(message) ? 'CHOOSE_CANCELLED' : 'CHOOSE_FAILED';
      normalized.detail = message;
      reject(normalized);
    };

    if (typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['original', 'compressed'],
        success: (response) => {
          const file = response.tempFiles && response.tempFiles[0];
          if (!file) return fail({ errMsg: 'chooseMedia:fail empty file' });
          resolve({ path: file.tempFilePath, size: Number(file.size) || 0 });
        },
        fail
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (response) => resolve({ path: response.tempFilePaths[0], size: 0 }),
      fail
    });
  });
}

function readImageInfo(file) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: file.path,
      success: (info) => {
        const extension = String(info.type || file.path.split('.').pop() || 'jpg').toUpperCase();
        const size = Number(file.size) || 0;
        resolve({
          path: file.path,
          imageMeta: {
            format: extension === 'JPEG' ? 'JPG' : extension,
            width: Number(info.width) || 0,
            height: Number(info.height) || 0,
            size,
            sizeLabel: formatByteSize(size)
          }
        });
      },
      fail: (error) => {
        const normalized = new Error('无法读取这张图片，请重新选择');
        normalized.code = 'IMAGE_READ_FAILED';
        normalized.detail = error && error.errMsg;
        reject(normalized);
      }
    });
  });
}

async function getImage() {
  return readImageInfo(await chooseRawImage());
}

module.exports = {
  formatByteSize,
  getImage
};
