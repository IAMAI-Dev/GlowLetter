const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const memory = new Map();
const app = {
  globalData: {
    cloudReady: true,
    cloudUnavailableReason: '',
    runtimeMode: 'cloud',
    user: { openid: 'openid-test-user' },
    appConfig: { uploadImageEnabled: true }
  }
};

global.getApp = () => app;
global.wx = {
  getStorageSync(key) {
    return memory.get(key) || '';
  },
  setStorageSync(key, value) {
    memory.set(key, value);
  },
  removeStorageSync(key) {
    memory.delete(key);
  },
  cloud: {}
};

const detectionService = require(path.join(ROOT, 'miniprogram/services/detection-service'));
const store = require(path.join(ROOT, 'miniprogram/utils/store'));

function resetRuntime() {
  memory.clear();
  app.globalData.cloudReady = true;
  app.globalData.runtimeMode = 'cloud';
  app.globalData.user = { openid: 'openid-test-user' };
  app.globalData.appConfig = { uploadImageEnabled: true };
}

test('内置演示图保存时不上传云存储', async () => {
  resetRuntime();
  let uploadCalls = 0;
  let createPayload;
  wx.cloud.uploadFile = async () => {
    uploadCalls += 1;
    return { fileID: 'unexpected' };
  };
  wx.cloud.callFunction = async ({ name, data }) => {
    assert.equal(name, 'createDetection');
    createPayload = data;
    return {
      result: {
        success: true,
        record: { _id: 'record-1', result: store.getDemoResult(), storageSource: 'cloud' }
      }
    };
  };

  await detectionService.createDetection({
    draft: {
      sampleName: 'A01',
      imageTempPath: store.DEMO_IMAGE,
      imageMeta: { width: 1536, height: 1152, format: 'PNG', size: 2202009 }
    }
  });
  assert.equal(uploadCalls, 0);
  assert.equal(createPayload.imageFileId, '');
  assert.equal(createPayload.imageSource, 'demo-asset');
});

test('记录创建失败时清理刚上传的孤儿图片', async () => {
  resetRuntime();
  let deletedFileID = '';
  wx.cloud.uploadFile = async () => ({
    fileID: 'cloud://env.bucket/detection-images/openid-test-user/file.jpg'
  });
  wx.cloud.callFunction = async () => {
    throw new Error('network timeout');
  };
  wx.cloud.deleteFile = async ({ fileList }) => {
    [deletedFileID] = fileList;
    return { fileList: [{ status: 0 }] };
  };

  await assert.rejects(() => detectionService.createDetection({
    draft: {
      sampleName: 'A01',
      imageTempPath: 'wxfile://tmp-image.jpg',
      imageMeta: { width: 100, height: 100, format: 'JPG', size: 1000 }
    }
  }), /网络连接异常/);
  assert.equal(deletedFileID, 'cloud://env.bucket/detection-images/openid-test-user/file.jpg');
});

test('离线模式分页只读取本地演示记录', async () => {
  resetRuntime();
  app.globalData.runtimeMode = 'offline-demo';
  store.saveDraft({ sampleName: 'local-1', imageTempPath: store.DEMO_IMAGE });
  store.createRecord({});
  store.saveDraft({ sampleName: 'local-2', imageTempPath: store.DEMO_IMAGE });
  store.createRecord({});

  const page = await detectionService.listDetections({ page: 1, pageSize: 1 });
  assert.equal(page.items.length, 1);
  assert.equal(page.total, 2);
  assert.equal(page.hasMore, true);
  assert.equal(page.items[0].storageSource, 'local');
});
