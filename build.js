import esbuild from 'esbuild';
import { glob } from 'glob';

// Build TypeScript files with esbuild (fast, no type checking)
async function buildWithEsbuild() {
  const entryPoints = await glob('src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts', 'src/__tests__/**'],
  });

  await esbuild.build({
    entryPoints,
    outdir: 'dist',
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    sourcemap: true,
    outExtension: { '.js': '.js' },
  });

  console.log('✅ JavaScript files built with esbuild');
}

// Main build process
async function build() {
  try {
    await buildWithEsbuild();
    console.log('ℹ️  Skipping declaration files (TypeScript OOM with MCP SDK 1.24.x - see issue #985)');
    console.log('🎉 Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
