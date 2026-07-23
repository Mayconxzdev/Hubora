process.env.PORT ||= '4187';
process.env.NODE_ENV = 'production';
process.env.HUBORA_E2E_ASSET_DIR = '.playwright/assets';

await import('../server.ts');
