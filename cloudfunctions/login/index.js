const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: '无法识别当前微信用户' } };
  }

  const users = db.collection('users');
  const existing = await users.where({ _id: OPENID }).limit(1).get();
  const baseUser = {
    _openid: OPENID,
    displayName: '绿荧访客',
    avatarUrl: '',
    role: 'user'
  };

  if (existing.data.length) {
    await users.doc(OPENID).update({ data: { updatedAt: db.serverDate() } });
  } else {
    await users.doc(OPENID).set({
      data: Object.assign({}, baseUser, {
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      })
    });
  }

  return {
    success: true,
    openid: OPENID,
    user: {
      displayName: baseUser.displayName,
      avatarUrl: baseUser.avatarUrl,
      role: baseUser.role
    }
  };
};
