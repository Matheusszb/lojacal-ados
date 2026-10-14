# Loja dos Calçados

Loja virtual e painel administrativo para a Loja dos Calçados em Rio do Sul, SC. A identidade usa o arquivo original `public/logo-loja-dos-calcados.png` fornecido pelo proprietário. O banner inicial usa `public/banner-editorial.png`, uma imagem ilustrativa gerada para o projeto e identificada como tal na página.

## Operação

- O Site publicado começa privado. O proprietário deve entrar com ChatGPT e abrir `/admin` antes de alterar o acesso do Site. O primeiro usuário autenticado nessa configuração privada assume a administração.
- Cadastre categorias e produtos no painel. Produtos publicados aparecem automaticamente no catálogo. Fotos enviadas ficam no R2; registros e estoque ficam no D1.
- O carrinho fica no navegador do cliente. A finalização grava o pedido no D1 e abre o WhatsApp com o número do pedido. O pedido permanece pendente até confirmação no painel.
- A confirmação verifica novamente o estoque e o reduz em uma transação. Cancelar uma venda confirmada devolve o estoque, mas não executa reembolso.
- Vendas presenciais reduzem o estoque ao serem registradas.
- Vendas presenciais registram forma de pagamento e valor unitário praticado. Pedidos do site podem avançar por confirmação, separação, pronto para retirada e finalização.
- Não há cobrança online ou cálculo de frete. Disponibilidade final, entrega e pagamento são combinados pela loja.

## Desenvolvimento local

Requer Node.js 22.13+ com npm. Na pasta do projeto:

```sh
npm ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_little_psynapse.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_next_omega_sentinel.sql
npm run dev
```

No preview portátil, abra `/signin-with-chatgpt?return_to=/admin` para usar a identidade local de desenvolvimento. O banco local fica em `.wrangler/state` e é separado do banco publicado. Não reaplique a mesma migração sobre um banco local que já a recebeu. Para testar o fluxo integrado em Windows com o preview em execução, use `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-local.ps1` em um banco local descartável.

## Verificação feita

O build e a verificação TypeScript passaram. Em um banco local descartável, foram testados cadastro de categoria e produto, checkout, registro de pedido, confirmação com baixa do estoque, venda presencial com preço e pagamento, etapas do pedido, estorno, indicadores, upload de imagem e leitura do arquivo.

## Escopo atual

O fluxo principal da loja está implementado. Cupons, importação de planilhas, permissões de funcionários, integrações de pagamento e frete, relatórios gráficos avançados e políticas comerciais definitivas ainda não estão implementados. O repositório contém o código; o banco D1 e as imagens R2 pertencem à implantação do Site e não são exportados para o GitHub. Não ative o acesso público antes de conferir os dados comerciais e entrar no painel como proprietário.
