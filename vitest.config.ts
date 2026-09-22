import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/teste/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Cobertura do que tem lógica. Componente de UI vendorizado e arquivo
      // gerado não entram: medir cobertura deles produz um número sem sentido.
      include: ['src/lib/**', 'src/features/**'],
      exclude: [
        'src/lib/supabase/database.types.ts',
        'src/lib/permissions/catalog.ts',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
});
