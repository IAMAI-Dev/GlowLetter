const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DEFAULT_CONFIG = Object.freeze({
  appNameZh: '绿荧来信',
  appNameEn: 'Glow Letter',
  mode: 'demo',
  demoModelVersion: 'demo-v0.1',
  uploadImageEnabled: true,
  historyEnabled: true,
  disclaimer: '当前为原型演示，结果由模拟数据生成。'
});

function isMissingConfigError(error) {
  const detail = String(error && (error.errMsg || error.message) || '');
  return /collection.*not.*exist|does not exist|集合.*不存在|-502005/i.test(detail);
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: '无法识别当前微信用户' } };
  }

  let stored = {};
  try {
    const result = await db.collection('app_config').where({ _id: 'global' }).limit(1).get();
    stored = result.data[0] || {};
  } catch (error) {
    if (!isMissingConfigError(error)) throw error;
  }
  return {
    success: true,
    config: Object.assign({}, DEFAULT_CONFIG, {
      appNameZh: stored.appNameZh || DEFAULT_CONFIG.appNameZh,
      appNameEn: stored.appNameEn || DEFAULT_CONFIG.appNameEn,
      mode: 'demo',
      demoModelVersion: stored.demoModelVersion || DEFAULT_CONFIG.demoModelVersion,
      uploadImageEnabled: stored.uploadImageEnabled !== false,
      historyEnabled: stored.historyEnabled !== false,
      disclaimer: stored.disclaimer || DEFAULT_CONFIG.disclaimer
    })
  };
};
