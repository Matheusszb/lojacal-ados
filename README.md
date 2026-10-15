# Loja dos Calçados

Loja virtual e painel administrativo para a Loja dos Calçados em Rio do Sul, SC. Usa a logo original em `public/logo-loja-dos-calcados.png`. A aplicação roda em Next.js na Vercel, com PostgreSQL, Auth e Storage do Supabase.

## Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com/dashboard). Em **SQL Editor**, execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Isso cria as tabelas, a sequência de pedidos e o bucket público `product-images`.
2. Em **Authentication → Providers**, mantenha o provedor **Email** habilitado. Em **Authentication → Users**, crie o usuário administrador com seu e-mail, senha forte e e-mail confirmado. O painel aceita somente o e-mail definido em `ADMIN_EMAIL`.
3. Copie a URL do projeto, a chave pública (publishable key), a chave de serviço (service role key) e a URL do **Transaction pooler** do banco. Essas credenciais ficam apenas nas variáveis da Vercel; não as salve no GitHub. A senha do banco deve estar codificada para uso em URL, caso contenha caracteres especiais.

## Configurar Vercel

Importe este repositório na [Vercel](https://vercel.com/new). Deixe **Root Directory** no diretório raiz do repositório e **Framework Preset** como **Next.js**. O build usa `npm run build` e produz `.next`.

Em **Project Settings → Environment Variables**, defina para Production e Preview, se usar previews:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL do Supabase Transaction pooler, com `sslmode=require` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase; somente no servidor |
| `ADMIN_EMAIL` | Mesmo e-mail do usuário administrador confirmado no Supabase |
| `NEXT_PUBLIC_SITE_URL` | URL pública final, por exemplo `https://sua-loja.vercel.app`, sem barra no fim |

Depois de salvar as variáveis, execute **Redeploy** na Vercel. Acesse `/admin/login` para entrar e cadastre categorias, produtos, estoque e imagens. Confira as informações comerciais antes de divulgar a loja.

## Desenvolvimento local

Requer Node.js 22.13 ou superior. Copie `.env.example` para `.env.local`, preencha as variáveis para um projeto Supabase de desenvolvimento e rode:

```sh
npm ci
npm run dev
```

`npm run build` verifica o build de produção. Nunca execute `supabase/schema.sql` no banco errado: ele cria a estrutura, mas não importa dados do antigo banco D1. O ambiente anterior continha apenas o registro administrativo na última verificação, sem produtos ou pedidos; confira novamente caso a loja tenha recebido dados depois disso.

## Funcionamento

O carrinho fica no navegador do cliente. O checkout grava o pedido no PostgreSQL e abre o WhatsApp com o número do pedido. A confirmação no painel verifica e reduz o estoque. Vendas presenciais também reduzem o estoque. As fotos enviadas ficam no Supabase Storage. Não há pagamento online nem cálculo automático de frete: atendimento, entrega e pagamento são combinados com a loja.

## Limites de verificação

O build local Next.js e a checagem TypeScript passaram. O banco, o login, o upload e o deploy em produção precisam das credenciais e do projeto Supabase configurados para um teste integrado.
