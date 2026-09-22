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
    // A ORDEM IMPORTA: o alias é avaliado de cima para baixo, e "@" casa com
    // qualquer caminho que comece por "@/". Se ele viesse primeiro, o alias
    // específico abaixo nunca seria alcançado — e o build de demonstração sairia
    // silenciosamente com o cliente de produção dentro.
    alias: {
      // No build de demonstração, o cliente Supabase é trocado por um que
      // responde a partir de dados embutidos. Fazer a troca aqui — e não com
      // um `if` dentro do cliente — mantém o bundle de produção sem nenhum
      // vestígio de demonstração.
      ...(mode === "demo"
        ? { "@/lib/supabase/client": path.resolve(__dirname, "./src/lib/supabase/client.demo.ts") }
        : {}),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // A demonstração é servida de um caminho qualquer, não da raiz do domínio.
  base: mode === "demo" ? "./" : "/",
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
