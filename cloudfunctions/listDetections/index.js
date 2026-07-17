const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function fail(code, message) {
  return { success: false, error: { code, message } };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail('UNAUTHENTICATED', '无法识别当前微信用户');
  const page = Number(event && event.page || 1);
  const pageSize = Number(event && event.pageSize || 5);
  if (!Number.isInteger(page) || page < 1) return fail('INVALID_PAGE', '页码无效');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) return fail('INVALID_PAGE_SIZE', '每页数量需为 1 至 20');

  const records = db.collection('detection_records').where({ _openid: OPENID });
  const [listResult, countResult] = await Promise.all([
    records.orderBy('createdAt', 'desc').skip((page - 1) * pageSize).limit(pageSize).get(),
    records.count()
  ]);
  const items = listResult.data.map((record) => Object.assign({}, record, {
    id: record._id,
    storageSource: 'cloud'
  }));

  return {
    success: true,
    items,
    total: countResult.total,
    hasMore: page * pageSize < countResult.total
  };
};
