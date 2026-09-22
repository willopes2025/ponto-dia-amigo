// O caminho com alias é obrigatório aqui, não uma preferência de estilo: o
// build de demonstração troca `@/lib/supabase/client` por `client.demo`, e um
// import relativo `./client` não passa pelo alias — o app continuaria falando
// com um Supabase que, na demonstração, não existe.
export { supabase } from '@/lib/supabase/client';
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './database.types';
