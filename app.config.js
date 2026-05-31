const path = require('path');
const appJson = require('./app.json');

try {
  require('@expo/env').load(path.resolve(__dirname));
} catch {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      sharedApiUrl: process.env.EXPO_PUBLIC_SHARED_API_URL,
      cafeApiUrl: process.env.EXPO_PUBLIC_CAFE_API_URL,
      fileSystemUrl: process.env.EXPO_PUBLIC_BACKEND_FILE_SYSTEM_URL,
    },
  },
};
