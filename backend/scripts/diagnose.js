const fs = require('fs');
const path = require('path');

console.log('==================================================');
console.log('      DEADLINE GUARDIAN AI - SYSTEM DIAGNOSTICS   ');
console.log('==================================================');
console.log(`Current Time: ${new Date().toISOString()}`);
console.log(`Node Version: ${process.version}`);
console.log('--------------------------------------------------');

let hasErrors = false;
let hasWarnings = false;

// 1. Dependency Checks
console.log('Checking dependencies...');
const rootDir = path.join(__dirname, '../..');
const backendNodeModules = path.join(rootDir, 'backend', 'node_modules');
const frontendNodeModules = path.join(rootDir, 'frontend', 'node_modules');

if (fs.existsSync(backendNodeModules)) {
  console.log('✅ Backend node_modules: Installed');
} else {
  console.log('❌ Backend node_modules: MISSING! (Run "npm run install-all" at the root level)');
  hasErrors = true;
}

if (fs.existsSync(frontendNodeModules)) {
  console.log('✅ Frontend node_modules: Installed');
} else {
  console.log('❌ Frontend node_modules: MISSING! (Run "npm run install-all" at the root level)');
  hasErrors = true;
}

// 2. Env File Verification
console.log('\nChecking environment variables...');
const envPath = path.join(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file: MISSING! Created new .env from .env.example. Please review it.');
  const exampleEnvPath = path.join(__dirname, '../.env.example');
  if (fs.existsSync(exampleEnvPath)) {
    fs.copyFileSync(exampleEnvPath, envPath);
  } else {
    fs.writeFileSync(envPath, 'PORT=5000\nJWT_SECRET=supersecretkey_deadlineguardian_ai\nGEMINI_API_KEY=\nGEMINI_MODEL=gemini-2.5-flash\nNODE_ENV=development\n');
  }
  hasErrors = true;
} else {
  console.log('✅ .env file: Exists');
}

// Load config
let config;
try {
  config = require('../config');
  console.log(`✅ Config: Loaded backend/config.js successfully`);
} catch (err) {
  console.error(`❌ Config: Failed to load backend/config.js:`, err.message);
  config = {};
  hasErrors = true;
}

// Check JWT_SECRET
if (config.JWT_SECRET === 'supersecretkey_deadlineguardian_ai' || config.JWT_SECRET?.startsWith('default_secret_key')) {
  console.log('⚠️ JWT_SECRET: Using default/placeholder secret key. (Acceptable for development, recommend changing for production)');
  hasWarnings = true;
} else if (config.JWT_SECRET) {
  console.log('✅ JWT_SECRET: Set and customized');
} else {
  console.log('❌ JWT_SECRET: NOT SET!');
  hasErrors = true;
}

// Check GEMINI_API_KEY
const apiKey = config.GEMINI_API_KEY;
if (!apiKey) {
  console.log('⚠️ GEMINI_API_KEY: NOT SET! The application will run in Mock AI fallback mode.');
  hasWarnings = true;
} else if (apiKey === 'your_gemini_api_key_here') {
  console.log(`⚠️ GEMINI_API_KEY: "${apiKey}" appears to be a placeholder string. The app will fall back to Mock AI mode.`);
  hasWarnings = true;
} else if (apiKey.startsWith('AIzaSy') || apiKey.startsWith('AQ.')) {
  console.log('✅ GEMINI_API_KEY: Format matches Google AI API keys.');
} else {
  console.log('⚠️ GEMINI_API_KEY: Custom key detected, format does not match typical "AIzaSy" or "AQ." prefix.');
  hasWarnings = true;
}

// Check GEMINI_MODEL
const modelName = config.GEMINI_MODEL || 'gemini-2.5-flash';
console.log(`ℹ️ Configured Gemini Model: "${modelName}"`);

// 3. Database Health Check
console.log('\nChecking Database...');
const dbPath = config.DB_PATH || path.join(__dirname, '../data/db.json');
const dbDir = path.dirname(dbPath);

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Try writing a test file to verify write access
  const testFilePath = path.join(dbDir, '.db-write-test');
  fs.writeFileSync(testFilePath, 'test', 'utf8');
  fs.unlinkSync(testFilePath);
  console.log('✅ Database Storage: Read & Write permissions verified');
  
  if (fs.existsSync(dbPath)) {
    const dbSize = fs.statSync(dbPath).size;
    console.log(`✅ Database file: Exists (${dbSize} bytes)`);
  } else {
    console.log(`ℹ️ Database file: Does not exist yet (Will be initialized on server start)`);
  }
} catch (err) {
  console.log(`❌ Database Storage: Write access failed: ${err.message}`);
  hasErrors = true;
}

// 4. Live Gemini API Connection Test
async function testGeminiAPI() {
  console.log('\nTesting Live Gemini API connection...');
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('ℹ️ Skipping API connection test: No valid GEMINI_API_KEY is configured. (Using heuristic Mock AI fallback)');
    finishDiagnostics();
    return;
  }

  let GoogleGenerativeAI;
  try {
    const aiModule = require('@google/generative-ai');
    GoogleGenerativeAI = aiModule.GoogleGenerativeAI;
  } catch (err) {
    console.log('❌ Failed to require "@google/generative-ai". Dependencies are missing or corrupted.');
    hasErrors = true;
    finishDiagnostics();
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    console.log(`Sending ping prompt to model "${modelName}"...`);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Write only the word "OK" in plain text.' }] }],
      generationConfig: { maxOutputTokens: 10 }
    });
    
    const responseText = result.response.text().trim();
    console.log(`✅ Gemini API Connection: SUCCESS! Model returned response: "${responseText}"`);
    console.log('🎉 Live multi-agent AI cascade is fully operational!');
  } catch (err) {
    console.log(`❌ Gemini API Connection: FAILED!`);
    console.log(`   Error message: ${err.message}`);
    console.log(`   Detailed suggestions:`);
    console.log(`   - Double check your API key in backend/.env`);
    console.log(`   - Verify that your network has access to Gemini APIs`);
    console.log(`   - If the model name is not supported on your key, change GEMINI_MODEL in backend/.env to "gemini-1.5-flash"`);
    console.log(`ℹ️ The application will start successfully, but will run in local high-fidelity MOCK AI fallback mode.`);
    hasWarnings = true;
  }

  finishDiagnostics();
}

function finishDiagnostics() {
  console.log('\n==================================================');
  if (hasErrors) {
    console.log('❌ DIAGNOSTICS COMPLETED: Issues were found that will block application startup.');
    console.log('   Please fix the errors noted above before running the app.');
  } else if (hasWarnings) {
    console.log('⚠️ DIAGNOSTICS COMPLETED: Warnings were found, but the application will run.');
    console.log('   Note: Running in Mock AI fallback mode if API key issues were reported.');
  } else {
    console.log('✅ DIAGNOSTICS COMPLETED: All systems green!');
    console.log('   Live Gemini AI mode is active and ready to prevent missed deadlines.');
  }
  console.log('==================================================');
  
  console.log('\nHow to start the application:');
  console.log('1. Install dependencies: npm run install-all (if not already done)');
  console.log('2. Run local servers:    npm run dev');
  console.log('3. Open frontend:        http://localhost:5173');
  console.log('==================================================');
}

testGeminiAPI();
