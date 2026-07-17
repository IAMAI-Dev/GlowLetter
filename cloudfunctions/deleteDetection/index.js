const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function fail(code, message) {
  return { success: false, error: { code, message } };
}

function isMissingFileError(value) {
  return /not.*exist|does not exist|不存在|404/i.test(String(value || ''));
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', '无法识别当前微信用户');
  const id = String(event && event.id || '').trim();
  if (!id || id.length > 128) return fail('INVALID_ID', '记录 ID 无效');

  const collection = db.collection('detection_records');
  const result = await collection.where({ _id: id, _openid: OPENID }).limit(1).get();
  const record = result.data[0];
  if (!record) return { success: true, deleted: false, alreadyMissing: true };

  if (record.imageFileId) {
    try {
      const deletedFiles = await cloud.deleteFile({ fileList: [record.imageFileId] });
      const fileResult = deletedFiles.fileList && deletedFiles.fileList[0];
      if (!fileResult) {
        return fail('IMAGE_DELETE_FAILED', '关联图片删除失败，记录已保留，请重试');
      }
      if (fileResult.status !== 0 && !isMissingFileError(fileResult.errMsg)) {
        return fail('IMAGE_DELETE_FAILED', '关联图片删除失败，记录已保留，请重试');
      }
    } catch (error) {
      if (!isMissingFileError(error && (error.errMsg || error.message))) {
        return fail('IMAGE_DELETE_FAILED', '关联图片删除失败，记录已保留，请重试');
      }
    }
  }

  await collection.doc(id).remove();
  return { success: true, deleted: true };
};
