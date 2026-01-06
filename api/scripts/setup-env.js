#!/usr/bin/env node

/**
 * Script de ayuda para configurar el entorno de desarrollo
 * Ejecutar: node scripts/setup-env.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: msg => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: msg => console.log(`${colors.red}✗${colors.reset} ${msg}`)
};

const apiDir = process.cwd();
const envLocalPath = path.join(apiDir, '.env.local');
const envLocalExamplePath = path.join(apiDir, '.env.local.example');

console.log('\n🚀 Setup de Entorno - Casino Platform API\n');

// 1. Verificar si ya existe .env.local
if (fs.existsSync(envLocalPath)) {
  log.warning('.env.local ya existe. Se mantendrá el archivo existente.');
  console.log('   Si quieres recrearlo, elimínalo manualmente primero.\n');
} else {
  // 2. Copiar .env.local.example a .env.local
  if (fs.existsSync(envLocalExamplePath)) {
    fs.copyFileSync(envLocalExamplePath, envLocalPath);
    log.success('Archivo .env.local creado desde .env.local.example');
  } else {
    log.error('No se encontró .env.local.example');
    process.exit(1);
  }
}

// 3. Verificar si Supabase está corriendo
log.info('Verificando estado de Supabase...');
try {
  const supabaseStatus = execSync('npx supabase status', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  log.success('Supabase está corriendo!');

  // Extraer información importante
  const apiUrl = supabaseStatus.match(/API URL: (.*)/)?.[1];
  const dbUrl = supabaseStatus.match(/DB URL: (.*)/)?.[1];
  const studioUrl = supabaseStatus.match(/Studio URL: (.*)/)?.[1];
  const anonKey = supabaseStatus.match(/anon key: (.*)/)?.[1];
  const serviceKey = supabaseStatus.match(/service_role key: (.*)/)?.[1];

  console.log('\n📋 Credenciales de Supabase:');
  console.log(`   API URL: ${colors.green}${apiUrl}${colors.reset}`);
  console.log(`   DB URL: ${colors.green}${dbUrl}${colors.reset}`);
  console.log(`   Studio: ${colors.blue}${studioUrl}${colors.reset}`);

  // 4. Actualizar .env.local con las credenciales
  let envContent = fs.readFileSync(envLocalPath, 'utf8');

  if (dbUrl) {
    envContent = envContent.replace(
      /DATABASE_URL=.*/,
      `DATABASE_URL=${dbUrl}`
    );
    envContent = envContent.replace(
      /DATABASE_URL_LOCAL=.*/,
      `DATABASE_URL_LOCAL=${dbUrl}`
    );
  }

  if (apiUrl) {
    envContent = envContent.replace(
      /SUPABASE_URL=.*/,
      `SUPABASE_URL=${apiUrl}`
    );
  }

  if (anonKey) {
    envContent = envContent.replace(
      /SUPABASE_ANON_KEY=.*/,
      `SUPABASE_ANON_KEY=${anonKey}`
    );
  }

  if (serviceKey) {
    envContent = envContent.replace(
      /SUPABASE_SERVICE_KEY=.*/,
      `SUPABASE_SERVICE_KEY=${serviceKey}`
    );
  }

  fs.writeFileSync(envLocalPath, envContent);
  log.success('Credenciales de Supabase configuradas en .env.local');

} catch (error) {
  log.warning('Supabase no está corriendo o no está disponible');
  log.info('Puedes iniciarlo con: npx supabase start');
  log.info('Luego ejecuta este script nuevamente o configura manualmente .env.local');
}

// 5. Verificar/generar secrets
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const needsSecrets =
  envContent.includes('your-jwt-secret') ||
  envContent.includes('your-refresh-token-secret') ||
  envContent.includes('your-session-secret');

if (needsSecrets) {
  log.warning('Detectados secrets por defecto en .env.local');
  log.info('Generando secrets seguros...\n');

  const crypto = require('crypto');
  const generateSecret = () => crypto.randomBytes(32).toString('base64');

  let updatedContent = envContent;
  updatedContent = updatedContent.replace(
    /JWT_SECRET=.*/,
    `JWT_SECRET=${generateSecret()}`
  );
  updatedContent = updatedContent.replace(
    /JWT_REFRESH_SECRET=.*/,
    `JWT_REFRESH_SECRET=${generateSecret()}`
  );
  updatedContent = updatedContent.replace(
    /SESSION_SECRET=.*/,
    `SESSION_SECRET=${generateSecret()}`
  );

  fs.writeFileSync(envLocalPath, updatedContent);
  log.success('Secrets generados y configurados');
}

// 6. Resumen final
console.log('\n✅ Setup completado!\n');
console.log('Próximos pasos:');
console.log(`  1. Revisa tu configuración: ${colors.blue}.env.local${colors.reset}`);
console.log(`  2. Inicia el servidor: ${colors.green}pnpm dev${colors.reset}`);
console.log(`  3. Abre Supabase Studio: ${colors.blue}http://localhost:55323${colors.reset}\n`);

console.log('Para más información, consulta: ENV_SETUP.md\n');
