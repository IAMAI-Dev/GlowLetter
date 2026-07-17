const cloudService = require('./cloud-service');
const runtimeService = require('./runtime-service');

async function initialize() {
  const response = await cloudService.callFunction('login');
  const user = Object.assign({}, response.user, {
    openid: response.openid,
    isOffline: false
  });
  runtimeService.useCloud(user);
  return user;
}

function enterOfflineDemo() {
  return runtimeService.useOfflineDemo();
}

module.exports = {
  initialize,
  enterOfflineDemo
};
