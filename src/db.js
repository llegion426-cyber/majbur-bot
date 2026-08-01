const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
}

ensureFile(SETTINGS_FILE, {});
ensureFile(USERS_FILE, {});

let writeQueue = Promise.resolve();
function safeWrite(file, data) {
  writeQueue = writeQueue.then(() =>
    fs.promises.writeFile(file, JSON.stringify(data, null, 2))
  );
  return writeQueue;
}

function readSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
}
function writeSettings(data) {
  return safeWrite(SETTINGS_FILE, data);
}

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}
function writeUsers(data) {
  return safeWrite(USERS_FILE, data);
}

module.exports = { readSettings, writeSettings, readUsers, writeUsers };
