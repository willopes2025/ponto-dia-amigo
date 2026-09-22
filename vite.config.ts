import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    // `true` escuta em todas as interfaces com fallback entre IPv4 e IPv6.
    // O `"::"` que vinha do template falha em ambiente sem IPv6.
    host: true,
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas mudam muito menos que o nosso código. Separá-las em
        // pedaços próprios faz o navegador reaproveitar o cache delas a cada
        // deploy, em vez de rebaixar tudo porque uma tela mudou.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          form: ["react-hook-form", "zod", "@hookform/resolvers"],
        },
      },
    },
  },
}));
