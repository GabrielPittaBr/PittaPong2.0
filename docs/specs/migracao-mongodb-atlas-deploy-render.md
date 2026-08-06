# Spec: Migração do MongoDB local para o MongoDB Atlas (habilitando deploy no Render)

- **Status:** ready-for-agent
- **Área:** infraestrutura / configuração de persistência
- **Alvo de hospedagem:** Render (Web Service, Node)
- **Estratégia de dados:** banco novo no Atlas, populado via `src/seed.js` (sem migração do banco local)

---

## Problem Statement

Hoje o PittaPong 2.0 só funciona na máquina do desenvolvedor. A variável `MONGO_URI` aponta para `mongodb://localhost`, que é um endereço que só existe dentro do próprio computador: qualquer servidor de hospedagem que rode a aplicação vai tentar se conectar a um MongoDB que não existe ali, falhar no `mongoose.connect` e derrubar o processo logo no boot (o `conectarDB` chama `process.exit(1)` em caso de erro).

Consequências práticas para o dono do projeto:

- Não é possível mostrar o site para ninguém — nem recrutador, nem professor, nem cliente — sem que a pessoa clone o repositório e suba um MongoDB local.
- Os dados (produtos cadastrados, usuários, vendas) existem apenas num banco efêmero na máquina local, sem backup e sem acesso remoto.
- O `package.json` não tem script `start` e o campo `main` aponta para `app.js` na raiz, quando o arquivo real é `src/app.js`. Plataformas de deploy que executam `npm start` por convenção não sabem como iniciar a aplicação.
- Os cookies de sessão JWT são emitidos sem as flags `secure` e `sameSite`, o que é aceitável em `http://localhost` mas é uma fragilidade quando o site passa a ser servido por HTTPS em um domínio público.

O problema, na voz do usuário: *"Eu terminei minha aplicação e ela funciona na minha máquina, mas eu não consigo colocá-la no ar porque o banco de dados está preso ao meu computador."*

## Solution

Trocar o banco de dados local por um cluster gerenciado no **MongoDB Atlas** (tier gratuito M0) e ajustar a aplicação para ser inicializável por uma plataforma de hospedagem, de forma que:

1. A aplicação continue rodando localmente exatamente como hoje — mudando **apenas o valor de `MONGO_URI`** no `.env`, sem alteração de código para trocar de ambiente.
2. O mesmo binário/código rode no Render lendo as credenciais das variáveis de ambiente da plataforma, nunca de um arquivo `.env` versionado.
3. A conexão com o Atlas seja autenticada (SCRAM), criptografada (TLS, implícito no protocolo `mongodb+srv://`) e restrita a um usuário de banco com permissão mínima (`readWrite` apenas no banco da aplicação).
4. A falha de configuração seja **explícita e imediata**: se `MONGO_URI` estiver ausente ou inválida, a aplicação deve dizer isso em texto claro no log, e não apenas morrer com um `process.exit(1)` silencioso.
5. O banco novo no Atlas seja populado pelo script de seed já existente, para que o site no ar não apareça vazio.

O ponto central de toda a mudança é que `src/config/db.js` já é o **único ponto de conexão da aplicação com o MongoDB**. A migração se aproveita disso: nenhum controller, model ou rota precisa ser tocado.

## User Stories

### Configuração do cluster no Atlas

1. Como desenvolvedor do PittaPong, quero criar uma conta no MongoDB Atlas, para ter um banco de dados acessível pela internet sem precisar administrar um servidor.
2. Como desenvolvedor, quero criar um cluster no tier gratuito M0, para hospedar o banco sem custo enquanto o projeto é um portfólio.
3. Como desenvolvedor, quero escolher a região do cluster próxima à região onde a aplicação vai rodar no Render, para que a latência entre a aplicação e o banco seja baixa e as páginas carreguem rápido.
4. Como desenvolvedor, quero nomear o banco de dados explicitamente como `pittapong`, para que meus dados não caiam no banco `test` genérico que o driver usa quando nenhum nome é informado na connection string.
5. Como desenvolvedor, quero criar um usuário de banco dedicado à aplicação com permissão `readWrite` restrita ao banco `pittapong`, para que um vazamento dessa credencial não dê acesso administrativo ao cluster inteiro.
6. Como desenvolvedor, quero gerar uma senha longa e apenas alfanumérica para esse usuário, para não ter que lidar com percent-encoding de caracteres especiais dentro da connection string.
7. Como desenvolvedor, quero configurar o Network Access do cluster para aceitar conexões da minha máquina durante o desenvolvimento, para conseguir testar a conexão localmente antes de subir.
8. Como desenvolvedor, quero configurar o Network Access para aceitar conexões da aplicação hospedada, para que o site no ar consiga ler e gravar no banco.
9. Como desenvolvedor, quero entender o trade-off de liberar `0.0.0.0/0` no Network Access, para saber que a segurança nesse cenário está apoiada na autenticação e no TLS, e não no filtro de IP.
10. Como desenvolvedor, quero copiar a connection string no formato `mongodb+srv://` da própria interface do Atlas, para não montar o endereço do cluster à mão e errar.

### Conexão da aplicação

11. Como desenvolvedor, quero apontar a `MONGO_URI` do meu `.env` local para o Atlas, para validar que a aplicação inteira funciona contra o banco remoto antes de tentar qualquer deploy.
12. Como desenvolvedor, quero que a aplicação continue lendo o endereço do banco exclusivamente de `MONGO_URI`, para que trocar entre local, Atlas de desenvolvimento e Atlas de produção seja só uma questão de mudar uma variável.
13. Como desenvolvedor, quero que a aplicação falhe imediatamente com uma mensagem clara quando `MONGO_URI` não estiver definida, para não perder tempo depurando um erro genérico de conexão.
14. Como desenvolvedor, quero que a mensagem de log de conexão bem-sucedida identifique o host do cluster mas **nunca** imprima usuário e senha, para não vazar credenciais nos logs da plataforma de hospedagem.
15. Como desenvolvedor, quero um timeout de seleção de servidor explícito, para que uma configuração errada de Network Access falhe em segundos com uma mensagem útil, em vez de pendurar o boot por 30 segundos.
16. Como desenvolvedor, quero que a aplicação só comece a aceitar requisições HTTP depois que a conexão com o banco estiver estabelecida, para que nenhum visitante veja um erro de "banco indisponível" numa página que deveria funcionar.
17. Como visitante do site, quero que as páginas de catálogo carreguem os produtos do banco remoto normalmente, para poder navegar pela loja sem perceber que o banco mudou de lugar.

### Preparação da aplicação para deploy

18. Como plataforma de hospedagem, quero um script `npm start` declarado no `package.json`, para saber como iniciar a aplicação sem configuração manual.
19. Como desenvolvedor, quero que o campo `main` do `package.json` aponte para o arquivo de entrada real (`src/app.js`), para que a metadata do pacote não contradiga a estrutura do projeto.
20. Como desenvolvedor, quero declarar a versão do Node esperada no `package.json`, para que a plataforma de hospedagem use um runtime compatível com as dependências (Express 5, Mongoose 9).
21. Como desenvolvedor, quero que a aplicação escute na porta fornecida por `process.env.PORT`, para que a plataforma consiga rotear tráfego para o processo.
22. Como plataforma de hospedagem, quero um endpoint de health check leve, para saber se a instância está viva sem precisar renderizar uma página completa com consulta ao banco.
23. Como desenvolvedor, quero que a aplicação confie no proxy reverso da plataforma, para que o Express reconheça que a requisição original chegou por HTTPS e as flags de cookie seguro funcionem.
24. Como usuário logado no site em produção, quero que meu cookie de sessão seja marcado como `secure`, para que ele nunca seja transmitido por uma conexão não criptografada.
25. Como usuário logado, quero que meu cookie de sessão tenha `sameSite` definido, para reduzir a exposição a requisições cross-site indesejadas.
26. Como desenvolvedor, quero que essas flags de cookie sejam condicionais ao ambiente, para que o login continue funcionando em `http://localhost` durante o desenvolvimento.

### Segredos e variáveis de ambiente

27. Como desenvolvedor, quero que o arquivo `.env` continue fora do controle de versão, para que credenciais reais do Atlas e do Cloudinary nunca sejam publicadas no GitHub.
28. Como desenvolvedor, quero que o `.env-exemplo` seja atualizado com um placeholder no formato `mongodb+srv://`, para que qualquer pessoa que clone o repositório saiba qual formato de string é esperado.
29. Como desenvolvedor, quero cadastrar todas as variáveis de ambiente na dashboard da plataforma de hospedagem (`MONGO_URI`, `JWT_SECRET`, `CLOUD_NAME`, `API_KEY`, `API_SECRET`, `NODE_ENV`), para que a aplicação em produção tenha tudo de que precisa.
30. Como desenvolvedor, quero gerar um `JWT_SECRET` novo e forte para produção, em vez de reaproveitar o valor de desenvolvimento, para que tokens emitidos em ambiente de teste não sejam válidos no site público.
31. Como desenvolvedor, quero saber que a plataforma reinicia a aplicação quando eu altero uma variável de ambiente, para não ficar confuso quando a mudança não aparece de imediato.
32. Como desenvolvedor, quero um procedimento claro de rotação de credenciais do banco, para conseguir revogar acesso rapidamente caso eu suspeite de vazamento.

### Popular o banco novo

33. Como desenvolvedor, quero rodar `node src/seed.js` apontando para o Atlas, para que o site no ar já apareça com produtos cadastrados em vez de um catálogo vazio.
34. Como desenvolvedor, quero que o seed continue sendo idempotente (não duplicar produtos nem usuários já existentes), para poder rodá-lo mais de uma vez sem sujar o banco.
35. Como desenvolvedor, quero trocar a senha do usuário-semente `pittapong@pittapong.com` antes de o site ir para o ar, para que uma credencial escrita no código-fonte público não seja uma conta válida em produção.
36. Como desenvolvedor, quero verificar pelo Atlas Data Explorer que as coleções `produtos` e `usuarios` foram criadas com os documentos esperados, para confirmar que o seed atingiu o banco correto.
37. Como desenvolvedor, quero confirmar que os dados foram para o banco `pittapong` e não para o banco `test`, para detectar cedo o erro de connection string sem nome de banco.

### Deploy e verificação

38. Como desenvolvedor, quero conectar o repositório do GitHub à plataforma de hospedagem, para que cada push na branch principal gere um novo deploy automaticamente.
39. Como desenvolvedor, quero acompanhar os logs de build e de runtime do primeiro deploy, para confirmar que a mensagem "Conectado ao MongoDB com sucesso!" aparece antes de "Servidor rodando na porta".
40. Como visitante, quero abrir a URL pública e ver a home renderizada com os produtos do catálogo, para confirmar que a aplicação está no ar e conversando com o banco.
41. Como visitante, quero conseguir me cadastrar, fazer login e sair pelo site publicado, para confirmar que a persistência de usuários e a autenticação por cookie funcionam em HTTPS.
42. Como vendedor, quero cadastrar um produto novo com upload de imagem pelo site publicado, para confirmar que a integração com o Cloudinary continua funcionando no ambiente hospedado.
43. Como vendedor, quero editar e remover um produto pelo site publicado, para confirmar que as operações de escrita chegam ao Atlas.
44. Como desenvolvedor, quero verificar no Atlas que os documentos criados pelo site publicado aparecem no cluster, para fechar o ciclo de validação ponta a ponta.
45. Como desenvolvedor, quero saber que o free tier do Render suspende a instância após um período de inatividade, para não interpretar a lentidão do primeiro acesso como um bug de conexão com o banco.
46. Como desenvolvedor, quero atualizar o README com a URL do site publicado e com instruções de configuração do Atlas, para que quem visitar o repositório entenda como o projeto é executado.

### Diagnóstico de falhas

47. Como desenvolvedor, quero reconhecer o erro de autenticação do MongoDB (`bad auth`), para saber que o problema é usuário/senha e não rede.
48. Como desenvolvedor, quero reconhecer o erro de seleção de servidor por timeout, para saber que o problema é quase sempre Network Access ou DNS, e não credencial.
49. Como desenvolvedor, quero saber que uma senha com caractere especial não escapado quebra o parse da URI, para conseguir diagnosticar rapidamente uma connection string aparentemente correta que não conecta.
50. Como desenvolvedor, quero saber que o `mongodb+srv://` depende de resolução DNS SRV, para entender por que a conexão pode falhar em redes corporativas restritivas.

## Implementation Decisions

### Seam única de conexão

`src/config/db.js` exporta `conectarDB()` e é o **único** ponto da aplicação que abre conexão com o MongoDB. Toda a mudança de infraestrutura passa por essa função, sem tocar em models, controllers, rotas ou views. Essa seam já existe e deve ser preservada — nenhuma nova seam será criada.

Exceção conhecida: `src/seed.js` abre a própria conexão com `mongoose.connect(process.env.MONGO_URI)`, duplicando a lógica. Como o seed é um script operacional executado manualmente e não parte do runtime da aplicação, a duplicação é aceitável nesta spec; unificar seed e app na mesma seam é uma melhoria opcional listada em *Out of Scope*.

### Módulo de conexão (`src/config/db.js`)

- Ler `process.env.MONGO_URI` **dentro** da função `conectarDB`, não no escopo de módulo. Hoje a variável é capturada no momento do `require`, o que só funciona porque `app.js` chama `dotenv.config()` antes de importar o módulo — um acoplamento de ordem de import frágil e invisível.
- Validar a presença de `MONGO_URI` antes de tentar conectar, e falhar com uma mensagem que nomeie a variável ausente.
- Passar `serverSelectionTimeoutMS` explícito (ordem de 10 segundos) para que erros de Network Access falhem rápido e com mensagem acionável.
- No log de sucesso, imprimir apenas o host do cluster e o nome do banco conectado — nunca a URI completa, que contém a senha.
- Manter o comportamento de encerrar o processo em falha de conexão inicial: a aplicação não tem funcionalidade útil sem banco, e um processo morto é um sinal mais claro para a plataforma de hospedagem do que um processo vivo servindo erros.
- Registrar handlers para os eventos `error` e `disconnected` da conexão do Mongoose, de modo que uma queda **após** o boot apareça nos logs em vez de se manifestar apenas como requisições pendurando.

### Formato da connection string

A `MONGO_URI` de produção usa o formato SRV do Atlas e **deve incluir o nome do banco no path**:

```
mongodb+srv://<usuario>:<senha>@<cluster>.<hash>.mongodb.net/pittapong?retryWrites=true&w=majority&appName=PittaPong
```

Decisões embutidas nesse formato:

- **`mongodb+srv://`** — resolução por DNS SRV (descobre automaticamente os nós do replica set) e TLS habilitado por padrão.
- **`/pittapong`** — sem esse segmento, o driver conecta ao banco `test`. Este é o erro mais comum da migração e a causa de "o seed rodou mas o site está vazio".
- **`retryWrites=true`** — reenvio automático de escritas em caso de failover do replica set. Relevante porque o Atlas é um replica set, diferente do `mongod` standalone local.
- **`w=majority`** — confirmação de escrita pela maioria dos nós, evitando que uma escrita confirmada se perca num failover.
- A senha precisa ser percent-encoded se contiver `@`, `:`, `/`, `?`, `#`, `[`, `]` ou `%`. A decisão adotada é **evitar o problema na origem**: gerar uma senha apenas alfanumérica.

### Cluster e usuário no Atlas

- **Tier:** M0 (gratuito, 512 MB). Suficiente para o catálogo de produtos e usuários deste projeto.
- **Provedor/região:** a mesma região geográfica do serviço no Render. Cluster e aplicação em continentes diferentes adicionam latência a cada consulta, e as páginas EJS são renderizadas no servidor — cada round-trip extra atrasa a resposta ao visitante.
- **Usuário de banco:** um usuário dedicado à aplicação, com role `readWrite` restrita ao banco `pittapong`. Não usar `atlasAdmin` nem `readWriteAnyDatabase`.
- **Network Access:** durante o desenvolvimento, o IP da máquina local. Para o Render, `0.0.0.0/0` — o free tier do Render não oferece IPs de saída estáticos, então uma allowlist por IP não é viável. A postura de segurança nesse cenário se apoia em: autenticação SCRAM, TLS obrigatório, usuário de permissão mínima e senha forte. Essa é uma decisão consciente, não um descuido.

### Manifesto do pacote (`package.json`)

- Adicionar `"start": "node src/app.js"` em `scripts`. Sem isso, o Render não sabe iniciar a aplicação.
- Corrigir `"main"` de `app.js` para `src/app.js`.
- Adicionar `"engines": { "node": ">=20" }` para fixar uma linha de runtime compatível com Express 5 e Mongoose 9.
- `prettier` está declarado em `dependencies` mas é ferramenta de desenvolvimento; movê-lo para `devDependencies` reduz o tamanho da instalação de produção. Mudança opcional, sem impacto funcional.

### Bootstrap da aplicação (`src/app.js`)

- Manter a ordem atual: conectar ao banco e só então chamar `app.listen`. Está correto e não deve ser alterado.
- Adicionar `app.set('trust proxy', 1)` quando em produção. O Render termina o TLS no proxy e encaminha a requisição por HTTP interno com o header `x-forwarded-proto`; sem essa configuração, o Express considera a requisição insegura e cookies `secure` nunca são enviados ao navegador.
- Adicionar uma rota `GET /health` que responde 200 com um corpo mínimo, sem consultar o banco. Serve de health check para a plataforma e de teste de fumaça trivial após o deploy.
- Adicionar tratamento de erro no `conectarDB().then(...)` para que uma rejeição não vire um unhandled rejection silencioso.

### Cookies de autenticação (`src/controllers/userControllers.js`)

Os três pontos que manipulam o cookie `token` (registro, login, logout) passam a usar opções condicionais ao ambiente:

- `httpOnly: true` — já presente, mantido.
- `secure: process.env.NODE_ENV === 'production'` — em produção o cookie só trafega por HTTPS; em desenvolvimento continua funcionando em `http://localhost`.
- `sameSite: 'lax'` — compatível com a navegação por links e formulários POST same-site que a aplicação usa, sem quebrar o fluxo de login.
- `maxAge` permanece em 1 dia, alinhado ao `expiresIn: '1d'` do JWT.

As mesmas opções (exceto `maxAge`) devem ser repetidas no `res.clearCookie` do logout — um cookie definido com `secure`/`sameSite` só é removido por um `clearCookie` com atributos correspondentes.

### Seed (`src/seed.js`)

- O script já é idempotente: verifica existência por `email` (usuário) e por `nome` (produto) antes de inserir. Comportamento preservado.
- A senha do usuário-semente está escrita no código-fonte de um repositório público. Antes do deploy, ela deve ser lida de uma variável de ambiente (com fallback para desenvolvimento) ou alterada manualmente no Atlas após o seed. Deixar como está significa publicar um site com uma conta de credencial conhecida.
- O seed é executado **manualmente uma vez** apontando para o Atlas, não durante o build do deploy. Rodá-lo em cada deploy é desnecessário (ele não faz nada nas execuções seguintes) e adiciona um ponto de falha ao boot.

### Variáveis de ambiente em produção

Cadastradas na dashboard do Render, não em arquivo:

| Variável | Origem |
|---|---|
| `MONGO_URI` | Connection string SRV do Atlas, com `/pittapong` no path |
| `JWT_SECRET` | Valor novo, gerado aleatoriamente para produção |
| `CLOUD_NAME`, `API_KEY`, `API_SECRET` | Credenciais do Cloudinary (as mesmas de desenvolvimento são aceitáveis) |
| `NODE_ENV` | `production` — é o que ativa cookies seguros e `trust proxy` |
| `PORT` | Fornecida automaticamente pelo Render; não cadastrar manualmente |

O `.env` permanece no `.gitignore` (já está). O `.env-exemplo` é atualizado para mostrar o formato `mongodb+srv://` e passa a incluir `NODE_ENV`.

## Testing Decisions

### O que caracteriza um bom teste aqui

Um bom teste desta mudança verifica **comportamento externo observável** — a aplicação sobe, responde HTTP e persiste dados no lugar certo — e não detalhes internos como "a função `conectarDB` chamou `mongoose.connect` com tais argumentos". Testar a chamada ao driver só verifica que o código é o código; não diz nada sobre a aplicação conseguir falar com o Atlas.

### Estado atual da infraestrutura de testes

O projeto **não possui testes automatizados**: o script `test` do `package.json` é o stub `echo "Error: no test specified" && exit 1`, e não há framework de teste instalado. Não existe prior art de testes neste repositório. Introduzir um runner de testes é uma decisão de escopo maior que uma migração de banco, e portanto não faz parte desta spec.

A verificação desta mudança é, por decisão consciente, **manual e baseada na aplicação em execução** — a seam mais alta possível.

### Seam de verificação

A verificação acontece no nível do **HTTP da aplicação rodando**, não no nível de módulo. Concretamente:

**Fase 1 — local contra o Atlas** (antes de qualquer deploy): com a `MONGO_URI` local apontando para o cluster, subir a aplicação e exercitar o fluxo completo. Isso isola o problema "conectar ao Atlas" do problema "rodar no Render". Se algo quebrar aqui, o Render não está envolvido.

**Fase 2 — no Render**: repetir os mesmos fluxos contra a URL pública.

### Roteiro de verificação (idêntico nas duas fases)

1. **Boot:** os logs mostram "Conectado ao MongoDB com sucesso!" **antes** de "Servidor rodando na porta N". A ordem importa — ela prova que a aplicação não começou a aceitar tráfego sem banco.
2. **Health:** `GET /health` responde 200.
3. **Leitura:** a home e `/produtos/listar` renderizam os produtos do seed. Uma página de catálogo vazia significa banco errado (provavelmente `test`) ou seed não executado.
4. **Leitura por id:** `/produto/:id` de um produto do seed renderiza os detalhes.
5. **Escrita de usuário:** cadastro de um usuário novo pelo formulário; conferir no Atlas Data Explorer que o documento apareceu na coleção `usuarios` do banco `pittapong`, com a senha em hash bcrypt (nunca em texto puro).
6. **Autenticação:** logout, login com o usuário recém-criado, e confirmação de que o header aparece no estado autenticado — isso exercita `optionalAuth`, o cookie e a leitura do usuário no banco em uma tacada.
7. **Cookie seguro (apenas fase 2):** inspecionar o cookie `token` no DevTools e confirmar as flags `HttpOnly` e `Secure`.
8. **Escrita de produto com upload:** cadastrar um produto com imagem em `/vender`; confirmar que a URL do Cloudinary foi gravada no array `imagens` do documento no Atlas. Este passo cobre simultaneamente a persistência e a integração externa.
9. **Atualização e remoção:** editar e excluir esse produto, confirmando o efeito no Atlas.
10. **Persistência entre reinícios:** reiniciar a instância e confirmar que os dados criados continuam lá — a prova de que o banco não é efêmero.

### Diagnóstico esperado por classe de falha

A verificação deve saber distinguir três falhas que se parecem no navegador mas têm causas distintas:

- `MongoServerError: bad auth` → usuário ou senha incorretos no Atlas, ou senha com caractere especial não escapado na URI.
- `MongooseServerSelectionError` com timeout → Network Access não libera o IP de origem, ou falha de DNS SRV.
- Aplicação sobe, responde, mas o catálogo está vazio → conectou ao banco errado (nome do banco ausente na connection string) ou o seed foi executado contra o banco local.

## Out of Scope

- **Migração dos dados do banco local para o Atlas.** Decisão tomada: o banco no Atlas nasce vazio e é populado pelo `src/seed.js`. `mongodump`/`mongorestore` não fazem parte desta spec.
- **Introdução de framework de testes automatizados.** Não há prior art no repositório; adicionar um runner, configurar um banco de teste e escrever a suíte é trabalho próprio, com escopo próprio.
- **Unificar `src/seed.js` na seam `conectarDB`.** Melhoria de coesão desejável, mas não bloqueia o deploy.
- **CI/CD além do auto-deploy nativo do Render.** Sem GitHub Actions, sem pipeline de testes, sem gates de qualidade.
- **Ambientes separados de staging e produção.** Um único cluster e um único serviço.
- **Domínio customizado e configuração de DNS.** A URL `*.onrender.com` é suficiente.
- **Otimização de performance de banco.** Índices (além do `unique` já declarado em `email`), connection pooling ajustado, análise de query — nada disso é necessário no volume atual.
- **Backups e disaster recovery.** O M0 tem limitações de backup conhecidas; formalizar uma política está fora do escopo.
- **Refatoração da lógica de autenticação.** As flags de cookie mudam; o desenho de sessões, refresh tokens e expiração não.
- **Migração do Cloudinary ou de qualquer outra dependência externa.** Continuam exatamente como estão.
- **Rate limiting, Helmet, CORS e demais hardening de produção.** Recomendável para um site público, mas é uma spec separada.

## Further Notes

### Runbook operacional

Sequência executável de ponta a ponta. As fases são deliberadamente ordenadas para que cada falha seja diagnosticável isoladamente.

#### Fase A — Provisionar o cluster no Atlas

1. Criar conta em `mongodb.com/cloud/atlas` (login com Google é aceito).
2. Criar um projeto (ex.: `PittaPong`).
3. Criar um cluster **M0 (Free)**. Escolher provedor e região próximos da região onde o serviço vai rodar no Render. Anotar a região escolhida — ela será reusada no passo 12.
4. Em **Database Access → Add New Database User**:
   - Método de autenticação: password.
   - Usuário: `pittapong_app`.
   - Senha: usar **Autogenerate Secure Password** e guardá-la; se editar, usar **apenas letras e números**.
   - Privilégios: **Specific Privileges** → role `readWrite` no banco `pittapong`.
5. Em **Network Access → Add IP Address**: adicionar o IP atual da máquina (**Add Current IP Address**). Este é o acesso para a Fase B.
6. Em **Database → Connect → Drivers**, selecionar Node.js e copiar a connection string. Ela virá no formato:
   ```
   mongodb+srv://pittapong_app:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
7. Editar a string em duas coisas: substituir `<db_password>` pela senha real e **inserir `pittapong` entre a barra e a interrogação**:
   ```
   mongodb+srv://pittapong_app:SENHA@cluster0.xxxxx.mongodb.net/pittapong?retryWrites=true&w=majority&appName=Cluster0
   ```
   Sem esse `pittapong`, tudo vai para o banco `test`.

#### Fase B — Validar localmente contra o Atlas

8. No `.env` local, substituir `MONGO_URI = mongodb://localhost` pela string do passo 7. Acrescentar `NODE_ENV = development`.
9. Rodar o seed: `node src/seed.js`. Saída esperada: conexão confirmada, usuário criado, dois produtos criados.
10. Conferir no Atlas (**Browse Collections**) que o banco se chama `pittapong` e contém as coleções `usuarios` e `produtos`. Se aparecer um banco `test`, a connection string está sem o nome do banco.
11. Subir a aplicação (`npm start`, após o ajuste do `package.json`) e percorrer o roteiro de verificação da seção *Testing Decisions*, fase 1. **Não avançar enquanto isso não estiver funcionando** — depurar Atlas e Render ao mesmo tempo é muito mais difícil do que depurar um de cada vez.

#### Fase C — Preparar o repositório

12. Aplicar as mudanças de código descritas em *Implementation Decisions*: `package.json` (script `start`, `main`, `engines`), `src/config/db.js`, `src/app.js` (`trust proxy`, `/health`), cookies em `src/controllers/userControllers.js`, `.env-exemplo`.
13. Confirmar que `.env` **não** está no diff (`git status` não deve listá-lo — ele já está no `.gitignore`).
14. Commit e push para a branch principal.

#### Fase D — Deploy no Render

15. Criar conta em `render.com` e autorizar o acesso ao repositório do GitHub.
16. **New → Web Service** → selecionar `PittaPong2.0`.
17. Configurar:
    - **Region:** a mesma região escolhida no passo 3.
    - **Branch:** `main`.
    - **Runtime:** Node.
    - **Build Command:** `npm install`.
    - **Start Command:** `npm start`.
    - **Instance Type:** Free.
18. Em **Environment**, cadastrar: `MONGO_URI`, `JWT_SECRET` (valor novo e forte), `CLOUD_NAME`, `API_KEY`, `API_SECRET`, `NODE_ENV=production`. **Não** cadastrar `PORT` — o Render a injeta.
19. Voltar ao Atlas → **Network Access** → adicionar `0.0.0.0/0` (*Allow access from anywhere*). O free tier do Render não tem IP de saída fixo. A proteção do banco continua sendo o usuário/senha e o TLS.
20. Disparar o deploy e acompanhar os logs. Sequência esperada: build, depois `Conectado ao MongoDB com sucesso!`, depois `Servidor rodando na porta ...`.
21. Abrir a URL pública e executar o roteiro de verificação, fase 2.

#### Fase E — Fechamento

22. Trocar a senha do usuário-semente `pittapong@pittapong.com`, que está em texto puro no repositório público.
23. Atualizar o README com a URL publicada e uma seção sobre configuração do Atlas.

### Armadilhas conhecidas

- **Senha com caractere especial na URI.** `@`, `#`, `:`, `/`, `?` dentro da senha quebram o parse da connection string e produzem erros de autenticação enganosos. Solução: senha alfanumérica.
- **Nome do banco ausente.** O sintoma é traiçoeiro: tudo conecta, nada dá erro, e o site fica vazio porque os dados foram para `test`.
- **Cold start do free tier do Render.** A instância hiberna após ~15 minutos sem tráfego; o primeiro acesso seguinte leva dezenas de segundos. Isso é a plataforma, não a conexão com o banco.
- **`dotenv` em produção.** `require('dotenv').config()` não encontra `.env` no servidor — e é exatamente o comportamento desejado. A chamada não falha; apenas não faz nada, e `process.env` já vem populado pela plataforma.
- **Formato do `.env` com espaços.** O arquivo atual usa `CHAVE = valor`. O `dotenv` trata isso corretamente, mas ao colar a URI não deixe espaços **dentro** do valor.
- **Mudança de variável de ambiente no Render** dispara um restart. A mudança não vale para o processo em execução.

### Restrições do M0 relevantes ao projeto

512 MB de armazenamento, throughput compartilhado, limite de conexões simultâneas mais baixo que os tiers pagos e sem backups automáticos configuráveis. Nenhuma dessas limitações é um problema no volume de um catálogo de portfólio, mas explicam eventual lentidão sob carga.

### Efeito colateral positivo

Depois desta migração, qualquer pessoa que clone o repositório e receba a `MONGO_URI` do Atlas consegue rodar o projeto **sem instalar MongoDB na máquina** — o que também simplifica o item de pré-requisitos do README.
