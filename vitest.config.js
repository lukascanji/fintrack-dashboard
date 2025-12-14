import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.js'],
        include: ['src/**/*.{test,spec}.{js,jsx}'],
        exclude: ['node_modules', 'e2e'],
        coverage: {
            reporter: ['text', 'html'],
            exclude: ['node_modules/', 'src/__tests__/']
        }
    }
});
