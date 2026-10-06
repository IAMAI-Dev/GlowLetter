const cloud = require('wx-server-sdk');
const { createHandler } = require('./agent');
const { callModel } = require('./model-client');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const handle = createHandler({
  env: process.env,
  callModel,
  logFailure: (details) => console.warn('AI request failed', details),
  async readRecord(recordId, openid) {
    const response = await db.collection('detection_records').where({ _id: recordId, _openid: openid }).limit(1).get();
    return response.data[0] || null;
  }
});
exports.main = async (event) => handle(event, cloud.getWXContext().OPENID);
