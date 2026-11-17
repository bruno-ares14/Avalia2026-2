# Engenharia de agentes — Projeto 0

Chave: `T26-3A-72FC-CE8A-AADA-5A53`.

## Harness e coordenação

Ambiente: Codex em ChatGPT Work, com subagentes separados, ferramentas de terminal, arquivos compartilhados e integração GitHub. Modelo-base da sessão: GPT-6, sem seleção manual de variante por agente. O agente principal distribuiu responsabilidades e contratos; os agentes editaram áreas separadas. Trabalho iniciado em 16/11/2026 e validação retomada em 17/11/2026 após interrupção. Este documento registra apenas o trabalho observado nos arquivos e resultados de testes.

## Agente 1 — backend

Skill consultada: `skills/serverless-d1-discord/SKILL.md`.
Implementou `lib/auth.js` e rotas em `functions/api/`: sessões HMAC com expiração e cookies HttpOnly/Secure; estado OAuth assinado; identidade obtida do Discord; validação de origem e corpo; consultas parametrizadas por proprietário; logout e erros sem falsa confirmação de persistência.

## Agente 2 — interface

Skill consultada: `skills/vanilla-dom-ui/SKILL.md`.
Implementou `public/`: painel HTML/CSS/JavaScript puro, estados de API/D1/OAuth/sessão, formulário acessível, histórico individual, login e logout, mensagens de erro e carregamento. Removeu usuário fictício. Adicionou cabeçalhos de proteção para conteúdo estático.

## Agente 3 — teste e validação

Skill consultada: `skills/teste-validacao/SKILL.md`.
A tarefa original `validation` foi interrompida antes de produzir testes. O subagente independente `validation_resume` retomou a responsabilidade em 17/11/2026 e produziu `tests/security.test.mjs` e `docs/VALIDACAO.md`: 20 testes locais aprovados, usando simuladores de Discord e D1. Revisou estaticamente o contrato da interface e executou o validador oficial (8/9, deploy pendente).

## Limitações verificadas

Ainda não foram comprovados deploy, login real Discord, D1 remoto, teste com duas contas ou inspeção visual em navegador. Arquivos de skills são os fornecidos pelo gerador do professor e foram consultados pelos respectivos agentes. Testes locais não substituem validação de produção. Nenhum Pull Request de teste deve ser enviado ao professor.
