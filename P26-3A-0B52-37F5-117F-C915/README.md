# Entrelinhas · Acervo de Citações e Notas de Leitura

Projeto 41 de Bruno Ares, turma 3A. Chave oficial **P26-3A-0B52-37F5-117F-C915**.

**URL_CLOUDFLARE** — pendente da publicação do projeto oficial.

## Como usar

O feed da turma apresenta citações públicas. Digite o autor ou tema para filtrar as fichas ou use **Citação aleatória** para sortear uma leitura pública e ver a reflexão. Entre com Discord para registrar um trecho, a autoria original, a obra, a página e suas anotações. Palestras aceitam um marcador de tempo no lugar da página. A visibilidade inicial é privada. **Meu acervo** reúne as fichas públicas e privadas do leitor autenticado.

## Implementação

HTML5, CSS3 e JavaScript puro em `public/`. As Cloudflare Pages Functions obtêm ID, nome e avatar através do OAuth2 do Discord, validam a sessão assinada e restringem a leitura de citações privadas pelo identificador do criador. Os dados ficam em tabelas relacionais no D1. A busca instantânea filtra os registros que o servidor já autorizou. O sorteio consulta exclusivamente registros públicos no servidor.

## Desenvolvimento local

Use Node.js 24 ou superior nesta pasta. Execute `npm test` para os testes e `npx wrangler pages dev public` para iniciar o site. Para testar login local, configure as três variáveis descritas abaixo no ambiente de desenvolvimento e cadastre a URL de callback correspondente no Discord. Os testes automatizados usam SQLite local e respostas simuladas do provedor OAuth.

## Publicação no Cloudflare Pages

Conecte o fork ao Pages. Selecione a branch `projeto-41`, o diretório raiz `P26-3A-0B52-37F5-117F-C915` e a pasta de saída `public`. Deixe vazio o comando de build. Crie um D1 exclusivo para o acervo. Antes do deploy, acrescente a `wrangler.jsonc` a lista `d1_databases` com o binding `DB`, o nome do novo banco em `database_name` e seu UUID real em `database_id`. O identificador depende da criação do banco na conta Cloudflare.

Cadastre `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` e `SESSION_SECRET` no ambiente de produção do Pages. O segredo de sessão deve ser aleatório, exclusivo deste projeto e ter ao menos 32 caracteres. Cadastre no Discord o domínio HTTPS efetivamente publicado seguido de `/api/auth/discord/callback`. Após configurar os segredos, publique novamente para que o deploy os utilize.

O esquema inicial está em `migrations/0001_acervo.sql`. O servidor inicializa um banco existente e vazio quando encontra as tabelas ausentes. Para migrar explicitamente, execute `npx wrangler d1 migrations apply DB --remote`. Após alterar a migração inicial durante o desenvolvimento, rode `node scripts/gerar-schema.mjs` e `npm test`.

## Verificação e entrega

A suíte local verifica persistência, isolamento de duas contas, sorteio público e o fluxo OAuth com um provedor simulado. Na publicação, confirme o domínio, o callback real, uma gravação e a leitura após recarregar. Registre a URL acima e rode `node validar-local.mjs P26-3A-0B52-37F5-117F-C915` na raiz do fork. A branch de entrega contém apenas a subpasta oficial sobre a base da disciplina.

As responsabilidades e skills dos três agentes estão em [AGENTS.md](AGENTS.md). Licença MIT em [LICENSE](LICENSE).
