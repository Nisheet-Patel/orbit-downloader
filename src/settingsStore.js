const Store = require('electron-store');
const { getDefaultSettings } = require('./constants');

const store = new Store({
  defaults: getDefaultSettings()
});

function getSettings() {
  return store.store;
}

function saveSettings(partial) {
  store.set(partial);
  return store.store;
}

module.exports = { getSettings, saveSettings };
