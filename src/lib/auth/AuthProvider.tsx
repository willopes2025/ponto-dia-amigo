import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { PermissionKey } from '@/lib/permissions/catalog';

import { AuthContext } from './context';
import type { AuthState, DadosCadastro, SessionContext, Store } from './types';

const CHAVE_STORE_LOCAL = 'visio:store-atual';

/**
 * Carrega, de uma vez, tudo que a aplicação precisa saber sobre quem entrou:
 * perfil, rede, filiais acessíveis e o conjunto de permissões.
 *
 * As permissões vêm de `current_permissions()`, uma chamada só. A alternativa —
 * perguntar `has_permission` a cada botão — seria centenas de round-trips por
 * tela para responder algo que não muda durante a sessão.
 */
async function carregarContexto(): Promise<SessionContext | null> {
  const [perfilRes, permissoesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, tenants!inner(*)')
      .limit(1)
      .maybeSingle(),
    supabase.rpc('current_permissions'),
  ]);

  if (perfilRes.error) throw perfilRes.error;
  if (!perfilRes.data) return null;
  if (permissoesRes.error) throw permissoesRes.error;

  const { tenants: tenant, ...profile } = perfilRes.data as typeof perfilRes.data & {
    tenants: SessionContext['tenant'];
  };

  // As filiais vêm por user_stores; o RLS já garante que só as da própria rede
  // apareçam, então o filtro aqui é só de acesso do usuário.
  const storesRes = await supabase
    .from('user_stores')
    .select('store_id, is_padrao, stores!inner(*)')
    .eq('profile_id', profile.id);

  if (storesRes.error) throw storesRes.error;

  const stores = (storesRes.data ?? [])
    .map((linha) => linha.stores as unknown as Store)
    .filter((store) => store.ativo)
    .sort((a, b) => a.codigo - b.codigo);

  return {
    profile: profile as SessionContext['profile'],
    tenant,
    stores,
    permissions: new Set((permissoesRes.data as string[] | null) ?? []),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [contexto, setContexto] = useState<SessionContext | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [storeAtualId, setStoreAtualId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(CHAVE_STORE_LOCAL);
    } catch {
      // Navegação privada ou storage bloqueado: cai no padrão do perfil.
      return null;
    }
  });

  // Evita corrida entre o onAuthStateChange e o getSession inicial: só o
  // carregamento mais recente pode escrever no estado.
  const geracao = useRef(0);

  const aplicarContexto = useCallback(async () => {
    const minhaGeracao = geracao.current + 1;
    geracao.current = minhaGeracao;

    try {
      const novo = await carregarContexto();
      if (geracao.current !== minhaGeracao) return;
      setContexto(novo);
    } catch (erro) {
      if (geracao.current !== minhaGeracao) return;
      // Sessão válida mas perfil inacessível é um estado inconsistente; deixar o
      // usuário "logado sem contexto" produziria telas vazias sem explicação.
      console.error('Falha ao carregar o contexto da sessão', erro);
      setContexto(null);
    }
  }, []);

  useEffect(() => {
    // A ordem importa: registrar o listener ANTES de pedir a sessão, para não
    // perder um evento que chegue no meio do caminho.
    const { data: subscription } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      setSessao(novaSessao);

      if (!novaSessao) {
        geracao.current += 1;
        setContexto(null);
        setCarregando(false);
        return;
      }

      // Não dá para chamar o Supabase de dentro do callback de auth (deadlock
      // conhecido do SDK); jogar para o próximo tick resolve.
      if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED' || evento === 'INITIAL_SESSION') {
        setTimeout(() => {
          void aplicarContexto().finally(() => setCarregando(false));
        }, 0);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      if (!data.session) {
        setCarregando(false);
        return;
      }
      void aplicarContexto().finally(() => setCarregando(false));
    });

    return () => subscription.subscription.unsubscribe();
  }, [aplicarContexto]);

  // A filial válida é: a escolhida, se o usuário ainda tem acesso a ela; senão a
  // última que ele usou; senão a primeira. Nunca uma filial que ele perdeu.
  const storeAtual = useMemo<Store | null>(() => {
    if (!contexto || contexto.stores.length === 0) return null;
    return (
      contexto.stores.find((s) => s.id === storeAtualId) ??
      contexto.stores.find((s) => s.id === contexto.profile.ultima_store_id) ??
      contexto.stores[0]
    );
  }, [contexto, storeAtualId]);

  const selecionarStore = useCallback(
    (storeId: string) => {
      setStoreAtualId(storeId);
      try {
        window.localStorage.setItem(CHAVE_STORE_LOCAL, storeId);
      } catch {
        // Storage indisponível é aceitável: a escolha vale para esta sessão.
      }
      // Persistir é uma conveniência: se falhar, não interrompe a troca de loja.
      void supabase
        .from('profiles')
        .update({ ultima_store_id: storeId })
        .eq('id', contexto?.profile.id ?? '')
        .then(({ error }) => {
          if (error) console.warn('Não foi possível lembrar a filial selecionada', error);
        });
    },
    [contexto?.profile.id],
  );

  const can = useCallback(
    (chave: PermissionKey) => contexto?.permissions.has(chave) ?? false,
    [contexto],
  );

  const valor = useMemo<AuthState>(
    () => ({
      carregando,
      usuarioAutenticado: Boolean(sessao),
      contexto,
      storeAtual,
      selecionarStore,
      can,
      canAlguma: (...chaves) => chaves.some((c) => can(c)),
      canTodas: (...chaves) => chaves.every((c) => can(c)),

      entrar: async (email, senha) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (!error) return { erro: null };

        // As mensagens do Supabase vêm em inglês e genéricas; traduzir aqui evita
        // "Invalid login credentials" na cara do lojista.
        const mensagem =
          error.message === 'Invalid login credentials'
            ? 'E-mail ou senha incorretos.'
            : error.message === 'Email not confirmed'
              ? 'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.'
              : error.message;
        return { erro: mensagem };
      },

      cadastrar: async ({ nome, email, senha, nomeRede, nomeLoja }: DadosCadastro) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/entrar`,
            // O gatilho handle_new_user lê estes campos: com convite pendente,
            // anexa à rede que convidou; sem convite, cria rede e filial.
            data: {
              nome: nome.trim(),
              ...(nomeRede ? { nome_rede: nomeRede.trim() } : {}),
              ...(nomeLoja ? { nome_loja: nomeLoja.trim() } : {}),
            },
          },
        });

        if (error) {
          const mensagem = error.message.includes('already registered')
            ? 'Já existe uma conta com este e-mail.'
            : error.message;
          return { erro: mensagem, confirmacaoPendente: false };
        }

        // Sem sessão na resposta significa que o projeto exige confirmação de
        // e-mail — o usuário precisa saber disso, não ficar olhando uma tela.
        return { erro: null, confirmacaoPendente: !data.session };
      },

      sair: async () => {
        await supabase.auth.signOut();
        geracao.current += 1;
        setContexto(null);
        try {
          window.localStorage.removeItem(CHAVE_STORE_LOCAL);
        } catch {
          // sem consequência
        }
      },

      recarregarContexto: aplicarContexto,
    }),
    [carregando, sessao, contexto, storeAtual, selecionarStore, can, aplicarContexto],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
