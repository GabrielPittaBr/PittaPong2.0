<div align="center">

<img src="src/public/img/PittaPong%20Logo.png" alt="PittaPong Logo" width="140" />

# PittaPong 2.0

**E-commerce de artigos esportivos de tênis de mesa** — catálogo de produtos com atributos dinâmicos, autenticação e upload de imagens, construído sobre uma arquitetura MVC com Node.js e MongoDB.

[![Ver Demo](https://img.shields.io/badge/🚀_Ver_Demo-pittapong.onrender.com-46E3B7?style=for-the-badge)](https://pittapong.onrender.com)

<br />

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-9-880000?style=for-the-badge&logo=mongoose&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-5-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-online-brightgreen?style=flat-square)
![PRs](https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square)

<br />

<img src="src/public/img/banner-PittaPong.png" alt="Banner PittaPong" width="100%" />

</div>

---

## 📑 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#️-tecnologias)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Deploy](#-deploy)
- [Endpoints da API](#-endpoints-da-api)
- [Como Testar a API](#-como-testar-a-api)
- [Governança e Boas Práticas](#-governança-e-boas-práticas)

---

## 📖 Sobre o Projeto

**PittaPong 2.0** é a versão atualizada e funcional do meu antigo trabalho, o PittaPong: um site e-commerce de artigos esportivos de tênis de mesa. A aplicação é estruturada no padrão **MVC (Model-View-Controller)** com **Node.js** e **MongoDB**, oferecendo um catálogo de produtos com atributos dinâmicos, sistema de autenticação, persistência em banco NoSQL e upload de imagens via Cloudinary.

---

## ✨ Funcionalidades

- 🛒 **Catálogo de produtos** com categorias dinâmicas (Raquetes, Bolinhas, Redes, Acessórios, Outros)
- 🔐 **Autenticação** com JWT armazenado em cookie `httpOnly`, senhas protegidas com BCrypt
- 🖼️ **Upload de até 5 imagens por produto**, armazenadas no Cloudinary
- 👤 **Validação de dono do produto** em edição e exclusão
- ❤️ **Health check** (`/health`) que responde sem consultar o banco
- 🌱 **Script de seed idempotente** para popular o banco com dados de exemplo

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
|---|---|
| **Backend** | Node.js (≥20), Express 5 |
| **Banco de Dados** | MongoDB + Mongoose (persistência NoSQL) |
| **View** | EJS (view engine) + Bootstrap 5 (estilização responsiva) |
| **Upload / Mídia** | Multer + Cloudinary (armazenamento de imagens) |
| **Segurança** | Bcrypt (hash de senhas) + JSON Web Token (autenticação) |
| **Infra / Deploy** | Render (Web Service) + MongoDB Atlas |

---

## 📁 Estrutura de Pastas

```
src/
├── app.js              # Ponto de entrada e configuração do Express
├── seed.js             # Script de popular o banco (idempotente)
├── config/             # Conexão com o banco e Cloudinary
├── controllers/        # Regras de negócio (produtos, usuários, páginas)
├── middlewares/        # Autenticação e upload de imagens
├── models/             # Schemas do Mongoose (Produto, Usuário)
├── routes/             # Definição das rotas
├── views/              # Templates EJS
└── public/             # Arquivos estáticos (CSS, JS, imagens)
```

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 ou superior.
- Um banco de dados MongoDB. O projeto usa um cluster no [MongoDB Atlas](https://www.mongodb.com/atlas/database) (o tier gratuito M0 é suficiente), mas uma instância local também funciona — basta ajustar a `MONGO_URI`.
- Conta no [Cloudinary](https://cloudinary.com/) (para habilitar o upload e gerenciamento de imagens dos produtos).

### 2. Clonar o repositório
```bash
git clone https://github.com/GabrielPittaBr/PittaPong2.0.git
cd PittaPong2.0
```

### 3. Instalar dependências
```bash
npm install
```

### 4. Configurar variáveis de ambiente
O projeto requer algumas variáveis de ambiente para realizar conexões com o banco e serviços externos. Existe um arquivo chamado `.env-exemplo` na raiz do repositório. Crie um arquivo com o nome `.env` e preencha as variáveis com suas credenciais:

```env
PORT = 3000
NODE_ENV = development
MONGO_URI = mongodb+srv://usuario:senha@cluster.xxxxx.mongodb.net/pittapong-db?retryWrites=true&w=majority
CLOUD_NAME = seu_cloud_name_cloudinary
API_KEY = sua_api_key_cloudinary
API_SECRET = sua_api_secret_cloudinary
JWT_SECRET = sua_jwt_secret
SEED_USER_PASSWORD = senha_da_conta_semente
```

> ⚠️ **Atenção à `MONGO_URI`:** a string copiada do Atlas vem sem o nome do banco. É preciso inseri-lo entre o host e a `?` (no exemplo acima, `/pittapong-db`). Sem ele o driver conecta ao banco `test`, a aplicação sobe sem erro nenhum e o catálogo aparece vazio. Se a senha contiver caracteres especiais (`@ : / ? # [ ] %`), use percent-encoding.

### 5. Popular o banco com dados iniciais (opcional)
Para iniciar a aplicação com alguns produtos de exemplo já cadastrados, você pode rodar o script de seed. (Verifique se sua variável `MONGO_URI` já está corretamente configurada.)
```bash
npm run seed
```
O script é idempotente: rodá-lo mais de uma vez não duplica produtos nem usuários. A conta criada é `pittapong@pittapong.com`, com a senha definida em `SEED_USER_PASSWORD`.

### 6. Iniciar o servidor
```bash
npm start
```
Acesse o projeto em seu navegador: [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy

A aplicação está hospedada no [Render](https://render.com/) como Web Service, com o banco em um cluster do MongoDB Atlas.

**URL de produção:** https://pittapong.onrender.com

### Configuração do serviço

| Campo | Valor |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Region | a mesma região do cluster no Atlas, para reduzir latência |

As variáveis de ambiente são cadastradas na dashboard do Render, **não** em arquivo — o `.env` está no `.gitignore` e nunca vai para o repositório. São as mesmas do `.env-exemplo`, com duas diferenças: `NODE_ENV` deve ser `production` (é o que ativa os cookies `secure` e o `trust proxy`), e `PORT` **não** deve ser cadastrada, já que a plataforma a injeta automaticamente.

No Atlas, o Network Access precisa liberar `0.0.0.0/0`: o tier gratuito do Render não oferece IP de saída fixo, então uma allowlist por IP não é viável. A proteção do banco fica por conta da autenticação SCRAM, do TLS e de um usuário com permissão `readWrite` restrita ao banco da aplicação.

> Cada push na branch `main` dispara um novo deploy automaticamente.

Os detalhes da migração do MongoDB local para o Atlas, incluindo os erros de conexão mais comuns e como diagnosticá-los, estão em [`docs/deploy-mongodb-atlas-render.md`](docs/deploy-mongodb-atlas-render.md).

---

## 📡 Endpoints da API

### Sistema
| Método | Rota | Descrição | Auth |
|---|---|---|:---:|
| `GET` | `/health` | Health check da aplicação. Responde `200 OK` sem consultar o banco. | — |

### Produtos
| Método | Rota | Descrição | Auth |
|---|---|---|:---:|
| `GET` | `/produtos` | Retorna a lista de todos os produtos em formato JSON. | — |
| `POST` | `/produtos` | Cria um novo produto (suporta upload de até 5 imagens). | 🔒 |
| `PUT` | `/produtos/:id` | Atualiza as informações de um produto específico. | 🔒 |
| `DELETE` | `/produtos/:id` | Deleta um produto específico do catálogo. | 🔒 |
| `POST` | `/produtos/:id/editar` | Edição de produto via formulário web (suporta novas imagens). | 🔒 |

> 🔒 = requer autenticação. Rotas de alteração também validam se o usuário é o **dono** do produto.

### Usuários (Autenticação)
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/usuario/cadastro` | Registra um novo usuário. As senhas são armazenadas com criptografia BCrypt. |
| `POST` | `/usuario/login` | Autentica um usuário e gera um token JWT em cookie `httpOnly`. |
| `GET` | `/usuario/logout` | Encerra a sessão atual, limpando o cookie JWT. |

---

## 🧪 Como Testar a API

> **Importante sobre a autenticação:** como o sistema usa cookies `httpOnly` para o JWT, a melhor forma de testar é: primeiro execute a rota de **Login**. O Talend (por padrão) vai salvar esse cookie automaticamente na sessão dele e enviá-lo nas próximas requisições (como as de Criar, Editar ou Deletar produtos).

<details>
<summary><strong>🔑 Autenticação (faça isso primeiro)</strong></summary>

<br />

#### 1. Cadastrar Usuário (POST)
- **Method:** `POST`
- **Scheme:** `http://`
- **Host:** `localhost:3000/usuario/cadastro`
- **Body:** Escolha a opção **JSON** ou **Form** (dependendo de como o back-end espera receber os dados).
  - Se for JSON, adicione:
    ```json
    {
      "nome": "João da Silva",
      "email": "joao@email.com",
      "senha": "senhaSegura123"
    }
    ```

#### 2. Fazer Login (POST)
- **Method:** `POST`
- **Scheme:** `http://`
- **Host:** `localhost:3000/usuario/login`
- **Body:** Escolha a opção **JSON**.
  - Exemplo JSON:
    ```json
    {
      "email": "joao@email.com",
      "senha": "senhaSegura123"
    }
    ```
- *Nota:* Após enviar essa requisição e receber sucesso (200 OK), o Talend guardará o cookie de autenticação em background.

#### 3. Fazer Logout (GET)
- **Method:** `GET`
- **Scheme:** `http://`
- **Host:** `localhost:3000/usuario/logout`

</details>

<details>
<summary><strong>📦 Produtos</strong></summary>

<br />

#### 1. Listar Produtos (GET)
- **Method:** `GET`
- **Scheme:** `http://`
- **Host:** `localhost:3000/produtos`
- **Headers (opcional):** Se quiser garantir que volte o JSON e não a página HTML, adicione um Header:
  - `Accept` : `application/json`

#### 2. Criar Produto (com upload de imagens) (POST)
- **Method:** `POST`
- **Scheme:** `http://`
- **Host:** `localhost:3000/produtos`
- **Body:** Para mandar imagens, **não** use JSON. Você precisa escolher a opção **Multipart Form** ou **Form Data** (dependendo do nome na extensão).
- **Parameters (Add Form Parameter):**
  - `nome`: (Text) Raquete Profissional
  - `preco`: (Text) 150.00
  - `descricao`: (Text) Raquete muito boa.
  - `categoria`: (Text) Raquetes
  - `imagens`: Mude o tipo de `Text` para **`File`** e selecione um arquivo de imagem do seu computador. (Você pode adicionar o campo "imagens" múltiplas vezes com arquivos diferentes.)

#### 3. Atualizar Produto (sem arquivo, via JSON) (PUT)
- **Method:** `PUT`
- **Scheme:** `http://`
- **Host:** `localhost:3000/produtos/ID_DO_PRODUTO_AQUI` (substitua pelo `_id` real retornado no banco)
- **Body:** Escolha **JSON**.
  - Exemplo:
    ```json
    {
      "preco": 130.00,
      "descricao": "Preço em promoção!"
    }
    ```

#### 4. Editar Produto via Formulário (com ou sem novas imagens) (POST)
- **Method:** `POST`
- **Scheme:** `http://`
- **Host:** `localhost:3000/produtos/ID_DO_PRODUTO_AQUI/editar`
- **Body:** Selecione **Multipart Form** ou **Form Data** (igual à criação).
- **Parameters:** Adicione os campos que deseja alterar (`nome`, `preco`, etc). Se quiser mandar novas imagens, adicione o campo `imagens` com o tipo **File**.

#### 5. Deletar Produto (DELETE)
- **Method:** `DELETE`
- **Scheme:** `http://`
- **Host:** `localhost:3000/produtos/ID_DO_PRODUTO_AQUI`
- **Body:** Nenhum (vazio).

</details>

---

## 🧭 Governança e Boas Práticas

- **🏛️ Arquitetura MVC:** o código-fonte segue rigorosamente a separação de responsabilidades (Models, Views e Controllers), localizada no diretório `/src`.
- **🛡️ Prevenção contra injeção de código:** o Mongoose é utilizado para schema validation e proteção nativa contra ataques de NoSQL Injection, garantindo tipagem estrita de todos os dados salvos no banco.
- **🌿 GitFlow:** o ciclo de desenvolvimento adota a estratégia de ramificação, com `main` para código de produção estável, `develop` como ambiente central de integração e `feature/*` branches para a criação isolada de novas tarefas.

---

<div align="center">

Desenvolvido por **[Gabriel Pitta](https://github.com/GabrielPittaBr)** • Licença ISC

</div>
