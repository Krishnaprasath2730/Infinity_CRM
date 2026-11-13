const path = require('path');
const fs = require('fs');

// Ensure environment variables are loaded from root .env or backend/.env
const rootEnv = path.join(__dirname, '.env');
const backendEnv = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else if (fs.existsSync(backendEnv)) {
  require('dotenv').config({ path: backendEnv });
} else {
  require('dotenv').config();
}

// Delegate to the backend server
require('./backend/server.js');
