const store = require('../utils/store');
const cloudService = require('./cloud-service');

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];

function normalizeExtension(imageMeta) {
  const value = String(imageMeta && imageMeta.format || 'jpg').toLowerCase();
  return ALLOWED_EXTENSIONS.includes(value) ? (value === 'jpeg' ? 'jpg' : value) : 'jpg';
}

function normalizeOwnerPath(openid) {
  return String(openid || 'visitor').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function createCloudPath(openid, imageMeta) {
  const owner = normalizeOwnerPath(openid);
  const nonce = Math.random().toString(36).slice(2, 10);
  return `detection-images/${owner}/${Date.now()}-${nonce}.${normalizeExtension(imageMeta)}`;
}

function isDemoAsset(path) {
  return !path || path === store.DEMO_IMAGE;
}

async function uploadDetectionImage(options) {
  const filePath = options && options.filePath;
  if (isDemoAsset(filePath)) {
    return { imageFileId: '', imageSource: 'demo-asset', uploaded: false };
  }

  cloudService.ensureCloudReady();
  try {
    const response = await wx.cloud.uploadFile({
      cloudPath: createCloudPath(options.openid, options.imageMeta),
      filePath
    });
    if (!response || !response.fileID) throw new Error('uploadFile did not return fileID');
    return { imageFileId: response.fileID, imageSource: 'cloud', uploaded: true };
  } catch (error) {
    throw cloudService.createServiceError(error, '图片上传失败，请检查网络后重试。');
  }
}

async function removeUploadedFile(fileID) {
  if (!fileID) return;
  try {
    await wx.cloud.deleteFile({ fileList: [fileID] });
  } catch (error) {
    console.warn('清理未关联的云存储图片失败。', error);
  }
}

async function resolveImagePath(record) {
  if (!record || !record.imageFileId) {
    return record && record.imagePath ? record.imagePath : store.DEMO_IMAGE;
  }
  cloudService.ensureCloudReady();
  try {
    const response = await wx.cloud.getTempFileURL({ fileList: [record.imageFileId] });
    const file = response && response.fileList && response.fileList[0];
    if (!file || file.status !== 0 || !file.tempFileURL) {
      throw new Error(file && file.errMsg ? file.errMsg : 'getTempFileURL failed');
    }
    return file.tempFileURL;
  } catch (error) {
    throw cloudService.createServiceError(error, '历史图片暂时无法读取，请稍后重试。');
  }
}

module.exports = {
  isDemoAsset,
  uploadDetectionImage,
  removeUploadedFile,
  resolveImagePath
};
