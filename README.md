# Meu Setup

Painel responsivo para planejar compras e registrar desempenho em jogos.

## Executar localmente

Use Node.js 22 ou superior. Instale com `npm ci` e rode `npm run dev`. Sem as variáveis do Supabase, o site salva no navegador. Em uma instalação configurada, acesse o mesmo endereço com `?local=1` para abrir os dados locais e usar **Exportar backup**.

## Espaço compartilhado no Supabase

O arquivo `supabase/schema.sql` cria o espaço e a API isolados do Meu Setup. No Barna Bank, a estrutura e a chave já foram provisionadas. Quem tem o link privado pode ver e editar a mesma lista, sem conta ou e-mail. Compartilhe o link diretamente com quem pode editar e mantenha a chave fora do repositório.

Copie `.env.example` para `.env.local` se precisar configurar outro ambiente. O frontend utiliza a URL do projeto e a chave **publicável** do Supabase. A chave do espaço vai somente no fragmento `#chave=…` do link, ou pode ser colada na tela de acesso. O banco armazena somente o hash dessa chave.

Para levar dados existentes ao espaço, exporte o JSON pelo modo local e use **Importar backup** no rodapé do espaço compartilhado antes da primeira alteração. Atualize a página para ver o que outra pessoa salvou. Se houver uma edição concorrente, recarregue antes de tentar novamente.

## GitHub Pages

1. Suba este diretório para a branch `main`.
2. Em **Settings → Pages → Source**, selecione **GitHub Actions**.
3. Em **Settings → Secrets and variables → Actions → Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores públicos do projeto.
4. Execute o workflow **Publicar no GitHub Pages**. No endereço publicado, acrescente o fragmento do link privado para abrir o espaço.

O arquivo `.env.local` fica fora do Git. Imagens enviadas são compactadas e persistidas com a lista; imagens por link dependem da URL original.
