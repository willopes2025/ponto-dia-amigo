# Começando — passo a passo

Guia para colocar a VISIO rodando no seu computador, conectada ao seu projeto
Supabase. Escrito para quem nunca fez isso antes: cada passo diz **o que abrir**,
**o que digitar** e **o que você deve ver**.

Tempo total: cerca de 20 minutos, a maior parte esperando instalação.

---

## Parte 1 · Terminar a configuração no Supabase

### 1.1 — Conferir se o schema foi aplicado direito

1. Abra o **[supabase.com](https://supabase.com)** e entre no seu projeto.
2. No menu da esquerda, clique no ícone **SQL Editor** (parece uma folha com "SQL").
3. Clique em **+ New query** (canto superior).
4. Cole o conteúdo do arquivo `supabase/conferir.sql` deste repositório.
5. Clique em **Run** (ou aperte `Ctrl + Enter`).

**O que você deve ver:** uma tabela com 8 linhas, todas começando com `ok`.

Se alguma linha vier `FALHOU`, pare aqui e me mande a tabela. A linha mais
importante é a do **gatilho em auth.users** — é ela que faz um cadastro virar
rede, filial e usuário proprietário de uma vez.

### 1.2 — Desligar a confirmação de e-mail (só para o primeiro teste)

Sem isso, ao se cadastrar você fica esperando um e-mail chegar.

1. No menu da esquerda: **Authentication**.
2. Clique em **Sign In / Providers** (ou **Providers**, dependendo da versão).
3. Encontre **Email** e clique nele.
4. Desligue a chave **Confirm email**.
5. Clique em **Save**.

Depois, quando o sistema estiver em produção, você liga de novo.

---

## Parte 2 · Instalar o Node.js

O Node.js é o programa que executa o sistema no seu computador. Instala uma vez
e serve para sempre.

1. Abra **[nodejs.org](https://nodejs.org)**.
2. Clique no botão que diz **LTS** (é a versão estável; o número muda com o
   tempo, tudo bem).
3. Abra o arquivo baixado e clique **Next / Avançar** até o fim. Não precisa
   mudar nada nas opções.
4. **Reinicie o computador.** Parece exagero, mas é o que evita o erro mais
   comum: o Windows só reconhece o Node depois de reiniciar.

### Como saber se deu certo

1. Aperte a tecla **Windows**, digite `powershell` e abra o **Windows PowerShell**.
2. Digite e aperte Enter:

   ```powershell
   node --version
   ```

**O que você deve ver:** algo como `v22.11.0`. Se aparecer "não é reconhecido
como nome de cmdlet", o Node não instalou ou o computador não foi reiniciado.

---

## Parte 3 · Baixar o código

1. Abra **[github.com/willopes2025/ponto-dia-amigo](https://github.com/willopes2025/ponto-dia-amigo)**
   (faça login se pedir).
2. Perto do topo, à esquerda, há um botão com um nome de branch — provavelmente
   escrito **main**. Clique nele.
3. Na lista que abrir, escolha **`claude/modest-carson-fwghpa`**.

   > Esta é a versão da VISIO. A `main` ainda tem o sistema antigo de ponto.

4. Clique no botão verde **Code** e depois em **Download ZIP**.
5. O arquivo vai para a pasta **Downloads**. Clique nele com o botão direito e
   escolha **Extrair tudo** → **Extrair**.
6. Vai aparecer uma pasta com nome comprido, algo como
   `ponto-dia-amigo-claude-modest-carson-fwghpa`.

   Para facilitar, **renomeie para `visio`** e **mova para a raiz do disco C:**,
   ficando em `C:\visio`.

---

## Parte 4 · Conectar ao seu Supabase

O sistema precisa saber o endereço do seu banco. Isso vai num arquivo chamado
`.env`.

1. Abra o **PowerShell** (tecla Windows → digite `powershell` → Enter).
2. Digite, uma linha de cada vez, apertando Enter no fim de cada:

   ```powershell
   cd C:\visio
   ```

   ```powershell
   Set-Content -Path .env -Value @(
     'VITE_SUPABASE_URL="https://nacqcjdufjvcvcfzyqdm.supabase.co"',
     'VITE_SUPABASE_ANON_KEY="COLE-SUA-CHAVE-AQUI"'
   )
   ```

   Troque `COLE-SUA-CHAVE-AQUI` pela sua chave (a que começa com
   `sb_publishable_`), mantendo as aspas.

3. Confira se deu certo:

   ```powershell
   Get-Content .env
   ```

**O que você deve ver:** as duas linhas que você acabou de escrever.

> **Por que não usar o Bloco de Notas:** ele salva como `.env.txt` sem avisar, e
> o sistema não encontra o arquivo. O comando acima evita essa armadilha.

> **Essa chave pode ficar visível?** Sim. Ela é pública por desenho — vai dentro
> do site que roda no navegador de qualquer visitante. Quem protege os dados é o
> RLS no banco, não ela. A chave que **nunca** pode aparecer é a `service_role`.

---

## Parte 5 · Ligar o sistema

Ainda no PowerShell, dentro de `C:\visio`:

### 5.1 — Instalar as peças (só na primeira vez)

```powershell
npm install
```

Demora de 1 a 3 minutos. Vai passar muito texto na tela — é normal.

**O que você deve ver no fim:** algo como `added 512 packages in 1m`.

Avisos em amarelo (`warn`) são normais e podem ser ignorados. Só erro em
vermelho (`ERR!`) é problema.

### 5.2 — Ligar

```powershell
npm run dev
```

**O que você deve ver:**

```
  VITE v5.4.21  ready in 512 ms

  ➜  Local:   http://localhost:8080/
```

### 5.3 — Abrir no navegador

Abra o navegador e vá em **http://localhost:8080**

Você deve ver a página inicial da VISIO, com o botão "Cadastrar minha ótica".

> **Importante:** deixe a janela do PowerShell aberta. Ela é o motor — fechando,
> o sistema desliga. Para desligar de propósito, clique na janela e aperte
> `Ctrl + C`.

---

## Parte 6 · Criar sua conta e ver tudo nascer

1. Clique em **Cadastrar minha ótica**.
2. Preencha:
   - **Seu nome:** seu nome completo
   - **Nome da rede ou da ótica:** o nome do negócio
   - **Nome da primeira loja:** pode deixar em branco
   - **E-mail** e **senha** (mínimo 8 caracteres)
3. Clique em **Criar conta**.

**O que deve acontecer:** você entra direto no painel, e ele mostra a sua rede,
a primeira filial e "268 de 268 permissões".

Nesse único clique o sistema criou, no seu banco: a rede, a primeira filial, o
seu perfil de proprietário, os cinco modelos de permissão, 8 formas de
pagamento, 6 grupos de produto com 17 subgrupos, o plano de contas e 91 feriados
— inclusive Carnaval e Corpus Christi calculados pela data da Páscoa de cada ano.

### Conferindo no banco

Volte ao **SQL Editor** do Supabase e rode:

```sql
select nome, slug, created_at from public.tenants;
select codigo, nome_fantasia from public.stores order by codigo;
select nome, is_owner from public.permission_profiles order by is_owner desc, nome;
```

Você deve ver a sua rede, a sua loja e os seis modelos de permissão.

---

## Se der errado

| O que apareceu | O que fazer |
|---|---|
| `node não é reconhecido` | O Node não instalou ou falta reiniciar o computador. Volte à Parte 2. |
| `npm ERR! ENOENT ... package.json` | Você não está na pasta certa. Digite `cd C:\visio` e tente de novo. |
| `Configuração de ambiente inválida` | O arquivo `.env` não foi criado ou está com nome errado. Volte à Parte 4 e rode `Get-Content .env`. |
| A tela fica branca | Aperte `F12` no navegador, clique em **Console** e me mande o print do que estiver em vermelho. |
| `Invalid API key` ao cadastrar | A chave no `.env` está incompleta. Copie de novo do Supabase, inteira. |
| Cadastra mas volta para o login | O gatilho em `auth.users` não foi criado. Rode a conferência da Parte 1.1 e me mande o resultado. |
| `Port 8080 is already in use` | Outro programa está usando a porta. Feche e rode `npm run dev -- --port 3000`, depois abra `http://localhost:3000`. |

Em qualquer erro: **tire um print da tela inteira** e me mande. A mensagem exata
é o que permite identificar a causa.

---

## Depois que funcionar

Quando você quiser que eu faça mudanças, elas vão para o GitHub e você precisa
baixar de novo. Para isso não virar repetição de ZIP, vale instalar o
[Git para Windows](https://git-scm.com/download/win) — aí atualizar vira um
comando só:

```powershell
cd C:\visio
git pull
npm install
npm run dev
```

E quando quiser um endereço de verdade, acessível de qualquer lugar sem ligar o
computador, a gente publica o sistema. Aí a pasta local passa a ser só para
desenvolvimento.
