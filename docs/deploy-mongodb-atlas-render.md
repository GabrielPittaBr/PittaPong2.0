# Migração para MongoDB Atlas e deploy no Render

Resumo das mudanças que tiraram a aplicação da máquina local e a colocaram no ar.
O documento de planejamento completo está em [`specs/migracao-mongodb-atlas-deploy-render.md`](specs/migracao-mongodb-atlas-deploy-render.md).

## Contexto

A aplicação só rodava localmente: `MONGO_URI` apontava para `mongodb://localhost:27017/pittapong-db`, um endereço que não existe fora da máquina de desenvolvimento. Qualquer servidor de hospedagem falharia no `mongoose.connect` e encerraria o processo no boot.

Além do banco, faltavam três coisas para uma plataforma conseguir iniciar o projeto: script `start` no `package.json`, `main` apontando para o arquivo correto e cookies preparados para HTTPS.

## O que mudou

### `src/config/db.js`

Continua sendo o **único ponto de conexão** da aplicação com o MongoDB — nenhum model, controller ou rota precisou ser alterado para a migração. As mudanças foram de robustez:

- `MONGO_URI` passou a ser lida dentro de `conectarDB()`, e não no escopo do módulo. Antes, o valor era capturado no `require`, o que só funcionava porque `app.js` chamava `dotenv.config()` antes do import — um acoplamento de ordem frágil e invisível.
- Validação explícita da variável ausente, com mensagem que a nomeia.
- `serverSelectionTimeoutMS: 10000`, para que erro de rede falhe em 10s com mensagem útil em vez de pendurar o boot.
- Log de sucesso mostra host e nome do banco, nunca a URI completa (que contém a senha).
- Listeners de `error` e `disconnected`, para que quedas depois do boot apareçam no log.

### `src/app.js`

- `app.set('trust proxy', 1)` quando `NODE_ENV=production`. O Render termina o TLS no proxy e encaminha por HTTP interno; sem isso o Express trata a requisição como insegura e cookies `secure` nunca chegam ao navegador.
- Rota `GET /health`, sem consulta ao banco, para health check da plataforma.
- `.catch()` no boot, para que uma falha não vire unhandled rejection silenciosa.

### `src/controllers/userControllers.js`

Opções de cookie centralizadas em `cookieOptions` e aplicadas nos três pontos (cadastro, login, logout):

- `secure: process.env.NODE_ENV === 'production'` — HTTPS obrigatório em produção, sem quebrar `http://localhost`.
- `sameSite: 'lax'` — compatível com a navegação por links e formulários da aplicação.
- Os mesmos atributos no `clearCookie` do logout; um cookie com `secure`/`sameSite` só é removido por um `clearCookie` correspondente.

### `src/seed.js`

A senha da conta-semente passou a vir de `SEED_USER_PASSWORD`, com fallback para o valor antigo. O valor anterior estava escrito no código de um repositório público, o que tornaria a conta `pittapong@pittapong.com` uma credencial conhecida assim que o site fosse ao ar.

### `package.json`

- `"start": "node src/app.js"` — sem isso o Render não sabe iniciar a aplicação.
- `"seed": "node src/seed.js"`.
- `main` corrigido de `app.js` para `src/app.js`.
- `engines.node: ">=20"`.

## Configuração do banco

Cluster M0 (gratuito) no Atlas, com um usuário dedicado de permissão `readWrite` restrita ao banco `pittapong-db`.

A connection string usa o formato SRV e **precisa incluir o nome do banco no path**:

```
mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/pittapong-db?retryWrites=true&w=majority
```

Sem o `/pittapong-db`, o driver conecta ao banco `test`: a aplicação sobe, não dá erro nenhum, e o catálogo aparece vazio.

`retryWrites` e `w=majority` importam porque o Atlas é um replica set, diferente do `mongod` standalone local.

**Network Access:** liberado para `0.0.0.0/0`. O free tier do Render não oferece IP de saída fixo, então allowlist por IP não é viável. A segurança do banco fica apoiada em autenticação SCRAM, TLS (implícito no `mongodb+srv://`) e usuário de permissão mínima.

## Variáveis de ambiente

Em desenvolvimento vêm do `.env` (fora do controle de versão). Em produção são cadastradas na dashboard do Render.

| Variável | Observação |
|---|---|
| `MONGO_URI` | String SRV do Atlas, com o nome do banco no path |
| `NODE_ENV` | `production` no Render — é o que ativa cookies seguros e `trust proxy` |
| `JWT_SECRET` | Valor forte e exclusivo de produção |
| `CLOUD_NAME`, `API_KEY`, `API_SECRET` | Credenciais do Cloudinary |
| `SEED_USER_PASSWORD` | Só necessária ao rodar `npm run seed` |
| `PORT` | **Não cadastrar no Render** — a plataforma injeta automaticamente |

## Problemas encontrados no deploy

Os dois erros que apareceram na prática, e como distingui-los:

**1. `Could not connect to any servers in your MongoDB Atlas cluster`**
Network Access do Atlas não liberava o IP de origem. O sintoma característico é a falha demorar exatamente o `serverSelectionTimeoutMS` (10s): o servidor nunca respondeu. Resolvido adicionando `0.0.0.0/0` — o "Add Current IP Address" do onboarding do Atlas cadastra o IP da máquina de desenvolvimento, não o do Render.

**2. `bad auth : authentication failed`**
Usuário ou senha divergentes no valor gravado no Render. Aqui a falha é rápida (~2s): o cluster respondeu e recusou a credencial. Vale conferir se a senha foi **colada** e não digitada — caracteres como `l` minúsculo, `1` e `I` são praticamente idênticos em fonte sem serifa.

Regra prática para separar as duas classes: **timeout longo é rede, resposta rápida é credencial.** Aplicação que sobe normal mas com catálogo vazio é terceiro caso — banco errado na connection string.

## Verificação

Roteiro usado para validar a migração, primeiro localmente contra o Atlas e depois no site publicado:

1. Logs mostram `Conectado ao MongoDB com sucesso!` **antes** de `Servidor rodando na porta` — prova que a aplicação não aceita tráfego sem banco.
2. `GET /health` responde 200.
3. Home e `/produtos/listar` renderizam os produtos do seed.
4. `GET /produtos` retorna o JSON vindo do Atlas.
5. Cadastro de usuário; o documento aparece na coleção `usuarios` com a senha em hash bcrypt.
6. Login emite o cookie `token`; senha errada redireciona para `/login?erro=...`.
7. Em produção, o cookie `token` mostra as flags `HttpOnly` e `Secure` no DevTools.
8. Cadastro de produto com upload — valida Cloudinary e escrita no Atlas de uma vez.

## Notas operacionais

- Push na `main` dispara deploy automático no Render. Variáveis de ambiente **não** acompanham o push: alterações nelas são feitas na dashboard, e salvar já reinicia a aplicação.
- O seed não roda no deploy. É executado manualmente com `npm run seed`.
- Se um deploy falhar (build quebrado ou app morrendo no boot), o Render mantém a versão anterior no ar.
- O free tier do Render hiberna a instância após ~15 minutos sem tráfego. O primeiro acesso seguinte leva dezenas de segundos — é a plataforma, não a conexão com o banco.
- `require('dotenv').config()` não encontra `.env` no servidor, e é o comportamento esperado: a chamada não falha, apenas não faz nada, e `process.env` já vem populado pelo Render.
