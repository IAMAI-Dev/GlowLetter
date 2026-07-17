const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function fail(code, message) {
  return { success: false, error: { code, message } };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', '无法识别当前微信用户');
  const id = String(event && event.id || '').trim();
  if (!id || id.length > 128) return fail('INVALID_ID', '记录 ID 无效');

  const result = await db.collection('detection_records').where({ _id: id, _openid: OPENID }).limit(1).get();
  const record = result.data[0];
  return {
    success: true,
    record: record ? Object.assign({}, record, { id: record._id, storageSource: 'cloud' }) : null
  };
};
