import {defineConfig} from 'tsup';

export default defineConfig((options) => {
  const dev = options.env?.dev === 'true';
  const entry = ['src/index.ts'];
  if (dev) {
    entry.push('src/cli.ts');
  }

  return {
    entry,
    outDir: 'lib',
    dts: true,
    clean: true,
    format: ['cjs', 'esm'],
    sourcemap: dev,
  };
});
