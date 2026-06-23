import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts'))              return 'vendor-recharts';
          if (id.includes('node_modules/xlsx'))                  return 'vendor-xlsx';
          if (id.includes('node_modules/@dnd-kit'))              return 'vendor-dnd';
          if (id.includes('node_modules/@supabase'))             return 'vendor-supabase';
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
          if (id.includes('node_modules/lucide-react'))          return 'vendor-lucide';
          if (id.includes('node_modules/react-router'))          return 'vendor-router';
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/')
          ) return 'vendor-react';
        },
      },
    },
  },
})
