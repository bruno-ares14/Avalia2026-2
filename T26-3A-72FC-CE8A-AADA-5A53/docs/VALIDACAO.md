# Validação independente — Projeto 0

Data: 17/11/2026. Agente responsável: `validation_resume`, no ambiente de agentes do Codex/ChatGPT Work. Skill consultada: `skills/teste-validacao/SKILL.md`.

## Resultado local

`npm test` executado com Node.js 24: **20 testes aprovados, 0 falhas, 0 ignorados**. A suíte usa `node:test` e `node:assert/strict`, sem dependências externas. Discord e D1 são substituídos por simuladores locais controlados; nenhum segredo real é utilizado.

Cobertura comportamental:

- Sessões HMAC válidas; rejeição de assinatura alterada, segredo incorreto, cookie duplicado, codificação inválida, expiração, emissão futura e duração excessiva.
- Separação entre tokens de estado OAuth e tokens de sessão.
- POST sem autenticação (401), origem ausente ou diferente (403), conteúdo incompatível (415), corpo excessivo (413) e dados inválidos (400).
- Rejeição de tentativa de fornecer identidade de outro usuário no JSON.
- Gravação parametrizada com identidade obtida exclusivamente da sessão autenticada.
- Banco ausente ou com falha retorna 503, sem confirmação falsa de gravação.
- Consultas de histórico e contagem filtradas pelo usuário e chave do projeto; visitante não recebe registros.
- OAuth exige configuração, banco e estado válido; estado ausente ou divergente não dispara chamada ao Discord.
- Fluxo OAuth simulado bem-sucedido importa perfil, persiste usuário e cria cookie assinado; falha de troca de token não cria sessão.
- Cancelamento da autorização e código ausente são tratados.
- Logout aceita apenas POST da mesma origem e apaga cookies de sessão e estado.

## Validador oficial

`node validar-local.mjs T26-3A-72FC-CE8A-AADA-5A53` executado na raiz do repositório: **8 verificações estruturais aprovadas; publicação online pendente**. Esse resultado precede a publicação. O README agora contém o endereço público observado.

O validador oficial procura arquivos e padrões de texto: sua aprovação estrutural não comprova execução real dos agentes, segurança completa ou login efetivo. A documentação de agentes deve registrar o trabalho efetivamente realizado.

## Revisão da interface

Inspeção do código confirmou compatibilidade com o contrato da API: `sessionUser.user_id`, `{conteudo}` no POST, `saved: true` antes de anunciar gravação e POST para logout. A interface não cria usuário fictício, bloqueia gravação sem sessão/banco e utiliza `textContent` para notas e nomes. Foram encontrados estados de erro, vazio e carregamento, rótulos de formulário e mensagens de estado acessíveis. A revisão foi estática; não equivale a testes visuais ou de navegador.

## Verificações ainda obrigatórias antes da conclusão

- Painel HTTPS e resposta da API confirmados pelo navegador em 17/11. A consulta inicial indicou banco indisponível e configuração Discord pendente.
- Após a inicialização das tabelas, o painel de produção mostrou a API disponível e o banco D1 conectado.
- O responsável confirmou o cadastro das três variáveis do login no painel da Cloudflare. A autorização com uma conta Discord e a gravação do ping ainda aguardam teste em produção.
- Executar autorização Discord real, logout e retorno de erro/cancelamento no navegador.
- Validar cookies `Secure`, `HttpOnly`, `SameSite=Lax` em produção.
- Gravar, recarregar e entrar novamente para confirmar persistência D1.
- Usar duas contas distintas para demonstrar isolamento real do histórico.
- Inspecionar interface no desktop e celular, teclado, foco e console.

Nenhum teste desta suíte deve ser apresentado como prova de execução remota. Não foi realizado deploy nem acesso a contas pelo agente de validação.
