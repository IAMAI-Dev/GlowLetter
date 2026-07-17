const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadCloudFunction(name, cloudMock) {
  const filename = path.join(ROOT, 'cloudfunctions', name, 'index.js');
  const code = fs.readFileSync(filename, 'utf8');
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require(request) {
      if (request === 'wx-server-sdk') return cloudMock;
      return require(request);
    },
    console,
    Date,
    Math,
    Object,
    Promise,
    RegExp,
    String,
    Number
  };
  vm.runInNewContext(code, sandbox, { filename });
  return module.exports.main;
}

function createCloudMock(options) {
  return Object.assign({
    DYNAMIC_CURRENT_ENV: 'dynamic-current-env',
    init() {},
    getWXContext() {
      return { OPENID: 'openid-test-user' };
    }
  }, options);
}

test('analyzeDemo 只接受 demo 模式并始终返回演示结果', async () => {
  const main = loadCloudFunction('analyzeDemo', createCloudMock());
  const invalid = await main({ sampleName: 'A01', mode: 'real' });
  assert.equal(invalid.success, false);
  assert.equal(invalid.error.code, 'INVALID_MODE');

  const invalidMeta = await main({ sampleName: 'A01', mode: 'demo', imageMeta: {} });
  assert.equal(invalidMeta.success, false);
  assert.equal(invalidMeta.error.code, 'INVALID_IMAGE_META');

  const valid = await main({
    sampleName: 'A01',
    mode: 'demo',
    imageMeta: { width: 1536, height: 1152, format: 'PNG', size: 2202009 }
  });
  assert.equal(valid.success, true);
  assert.equal(valid.result.isDemo, true);
  assert.equal(valid.result.modelVersion, 'demo-v0.1');
});

test('createDetection 拒绝其他用户目录中的文件 ID', async () => {
  let addCalled = false;
  const db = {
    serverDate: () => new Date('2026-07-17T00:00:00.000Z'),
    collection: () => ({
      add: async () => {
        addCalled = true;
        return { _id: 'record-1' };
      }
    })
  };
  const main = loadCloudFunction('createDetection', createCloudMock({ database: () => db }));
  const result = await main({
    sample: { sampleName: 'A01' },
    imageFileId: 'cloud://env.bucket/detection-images/another-user/image.jpg',
    imageMeta: { width: 100, height: 100, format: 'JPG', size: 1000 }
  });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_FILE_ID');
  assert.equal(addCalled, false);
});

test('createDetection 忽略前端结果并写入固定演示结果', async () => {
  let storedRecord;
  const db = {
    serverDate: () => new Date('2026-07-17T00:00:00.000Z'),
    collection: () => ({
      add: async ({ data }) => {
        storedRecord = data;
        return { _id: 'record-1' };
      }
    })
  };
  const main = loadCloudFunction('createDetection', createCloudMock({ database: () => db }));
  const result = await main({
    sample: { sampleName: 'A01' },
    result: { isDemo: false, concentration: 999 },
    imageFileId: '',
    imageMeta: { width: 1536, height: 1152, format: 'PNG', size: 2202009 }
  });
  assert.equal(result.success, true);
  assert.equal(storedRecord._openid, 'openid-test-user');
  assert.equal(storedRecord.result.isDemo, true);
  assert.equal(storedRecord.result.concentration, 12.6);
});

test('listDetections 始终按当前 OpenID 查询并限制分页', async () => {
  const calls = {};
  const query = {
    orderBy(field, direction) {
      calls.orderBy = [field, direction];
      return this;
    },
    skip(value) {
      calls.skip = value;
      return this;
    },
    limit(value) {
      calls.limit = value;
      return this;
    },
    async get() {
      return { data: [{ _id: 'record-1', result: { isDemo: true } }] };
    },
    async count() {
      return { total: 6 };
    }
  };
  const db = {
    collection: () => ({
      where(condition) {
        calls.where = condition;
        return query;
      }
    })
  };
  const main = loadCloudFunction('listDetections', createCloudMock({ database: () => db }));
  const result = await main({ page: 2, pageSize: 5 });
  assert.equal(result.success, true);
  assert.equal(calls.where._openid, 'openid-test-user');
  assert.deepEqual(calls.orderBy, ['createdAt', 'desc']);
  assert.equal(calls.skip, 5);
  assert.equal(calls.limit, 5);
  assert.equal(result.hasMore, false);
});

test('deleteDetection 在图片删除失败时保留数据库记录', async () => {
  let removeCalled = false;
  const db = {
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: async () => ({ data: [{ _id: 'record-1', imageFileId: 'cloud://env/file.jpg' }] })
        })
      }),
      doc: () => ({
        remove: async () => {
          removeCalled = true;
        }
      })
    })
  };
  const cloud = createCloudMock({
    database: () => db,
    deleteFile: async () => ({ fileList: [{ status: -1, errMsg: 'permission denied' }] })
  });
  const main = loadCloudFunction('deleteDetection', cloud);
  const result = await main({ id: 'record-1' });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'IMAGE_DELETE_FAILED');
  assert.equal(removeCalled, false);
});

test('deleteDetection 将已不存在的图片视为幂等成功', async () => {
  let removeCalled = false;
  const db = {
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: async () => ({ data: [{ _id: 'record-1', imageFileId: 'cloud://env/file.jpg' }] })
        })
      }),
      doc: () => ({
        remove: async () => {
          removeCalled = true;
        }
      })
    })
  };
  const cloud = createCloudMock({
    database: () => db,
    deleteFile: async () => ({ fileList: [{ status: -1, errMsg: 'file does not exist' }] })
  });
  const main = loadCloudFunction('deleteDetection', cloud);
  const result = await main({ id: 'record-1' });
  assert.equal(result.success, true);
  assert.equal(removeCalled, true);
});
