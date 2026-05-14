# PittaPong2.0

Versão atualizada e funcional do meu antigo trabalho, PittaPong, um site e-commerce de artigos esportivos de tênis de mesa. Trabalho: Desenvolvimento de API REST Escalável com Node.js e MongoDB. O projeto consiste em um Catálogo de Produtos com atributos dinâmicos, contando com sistema de autenticação, persistência de dados em banco NoSQL (MongoDB) e upload de imagens (Cloudinary).

## Tecnologias Utilizadas
- **Node.js** & **Express**
- **MongoDB** & **Mongoose** (Persistência NoSQL)
- **EJS** (View Engine)
- **Cloudinary** (Armazenamento de imagens)
- **Bcrypt** (Criptografia de senhas)
- **JSON Web Token (JWT)** (Autenticação)
- **Bootstrap 5** (Estilização responsiva)

## Como Rodar o Projeto Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.
- Banco de dados MongoDB em execução (pode ser local ou via cluster online no [MongoDB Atlas](https://www.mongodb.com/atlas/database)).
- Conta no [Cloudinary](https://cloudinary.com/) (para habilitar o upload e gerenciamento de imagens dos produtos).

### 2. Clonar o Repositório
```bash
git clone https://github.com/GabrielPittaBr/PittaPong2.0.git
cd PittaPong2.0
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Configurar Variáveis de Ambiente
O projeto requer algumas variáveis de ambiente para realizar conexões com o banco e serviços externos.
Existe um arquivo chamado `.env-exemplo` na raiz do repositório. Crie um arquivo com o nome `.env` e preencha as variáveis com suas credenciais:

```env
PORT = 3000
MONGO_URI = sua_string_do_mogodb
CLOUD_NAME = seu_cloud_name_cloudinary
API_KEY = sua_api_key_cloudinary
API_SECRET = seu_api_secret_cloudinary
JWT_SECRET = sua_jwt_secret
```

### 5. Popular o Banco de Dados com Dados Iniciais (Opcional)
Para iniciar a aplicação com alguns produtos de exemplo já cadastrados, você pode rodar o script de seed. (Verifique se sua variável `MONGO_URI` já está corretamente configurada).
```bash
node src/seed.js
```

### 6. Iniciar o Servidor
Para rodar a aplicação, execute o comando:
```bash
node src/app.js
```

Acesse o projeto em seu navegador: [http://localhost:3000](http://localhost:3000)

## Endpoints da API

### Produtos
- `GET /produtos` - Retorna a lista de todos os produtos cadastrados em formato JSON.
- `POST /produtos` - Cria um novo produto no catálogo (Requer autenticação e suporta upload de até 5 imagens).
- `PUT /produtos/:id` - Atualiza as informações de um produto específico (Requer autenticação e validação de dono do produto).
- `DELETE /produtos/:id` - Deleta um produto específico do catálogo (Requer autenticação e validação de dono do produto).
- `POST /produtos/:id/editar` - Endpoint específico para edição de produto via formulário web (suporta envio de novas imagens).

### Usuários (Autenticação)
- `POST /usuario/cadastro` - Registra um novo usuário no sistema. As senhas são protegidas e armazenadas usando criptografia BCrypt.
- `POST /usuario/login` - Autentica um usuário existente e gera um token JWT armazenado em um cookie de sessão httpOnly.
- `GET /usuario/logout` - Encerra a sessão atual do usuário, invalidando/limpando o cookie JWT.

## Como Testar a API (Talend API Tester / Postman)

> **Importante sobre a Autenticação:** Como o sistema usa cookies `httpOnly` para o JWT, a melhor forma de testar é: primeiro execute a rota de **Login**. O Talend (por padrão) vai salvar esse cookie automaticamente na sessão dele e enviá-lo nas próximas requisições (como as de Criar, Editar ou Deletar produtos).

### Aqui está o passo a passo de como configurar cada requisição:

---

### Autenticação (Faça isso primeiro)

#### 1. Cadastrar Usuário (POST)
*   **Method:** `POST`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/usuario/cadastro`
*   **Body:** Escolha a opção **JSON** ou **Form** (dependendo de como o seu back-end espera receber os dados).
    *   Se for JSON, adicione:
        ```json
        {
          "nome": "João da Silva",
          "email": "joao@email.com",
          "senha": "senhaSegura123"
        }
        ```

#### 2. Fazer Login (POST)
*   **Method:** `POST`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/usuario/login`
*   **Body:** Escolha a opção **JSON**.
    *   Exemplo JSON:
        ```json
        {
          "email": "joao@email.com",
          "senha": "senhaSegura123"
        }
        ```
*   *Nota:* Após enviar essa requisição e receber sucesso (200 OK), o Talend guardará o cookie de autenticação em background.

#### 3. Fazer Logout (GET)
*   **Method:** `GET`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/usuario/logout`

---

### Produtos

#### 1. Listar Produtos (GET)
*   **Method:** `GET`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/produtos`
*   **Headers (opcional):** Se quiser garantir que volte o JSON e não a página HTML, você pode adicionar um Header:
    *   `Accept` : `application/json`

#### 2. Criar Produto (Com upload de imagens) (POST)
*   **Method:** `POST`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/produtos`
*   **Body:** Para mandar imagens, **não** use JSON. Você precisa escolher a opção **Multipart Form** ou **Form Data** (dependendo do nome na extensão).
*   **Parameters (Add Form Parameter):**
    *   `nome`: (Text) Raquete Profissional
    *   `preco`: (Text) 150.00
    *   `descricao`: (Text) Raquete muito boa.
    *   `categoria`: (Text) Raquetes
    *   `imagens`: Mude o tipo de `Text` para **`File`** e selecione um arquivo de imagem do seu computador. (Você pode adicionar o campo "imagens" múltiplas vezes com arquivos diferentes).

#### 3. Atualizar Produto (Sem arquivo, via JSON) (PUT)
*   **Method:** `PUT`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/produtos/ID_DO_PRODUTO_AQUI` (Substitua pelo `_id` real retornado no banco)
*   **Body:** Escolha **JSON**.
    *   Exemplo:
        ```json
        {
          "preco": 130.00,
          "descricao": "Preço em promoção!"
        }
        ```

#### 4. Editar Produto via Formulário (Com ou sem novas imagens) (POST)
*   **Method:** `POST`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/produtos/ID_DO_PRODUTO_AQUI/editar`
*   **Body:** Selecione **Multipart Form** ou **Form Data** (igual à criação).
*   **Parameters:** Adicione os campos que deseja alterar (`nome`, `preco`, etc). Se quiser mandar novas imagens, adicione o campo `imagens` com o tipo **File**.

#### 5. Deletar Produto (DELETE)
*   **Method:** `DELETE`
*   **Scheme:** `http://`
*   **Host:** `localhost:3000/produtos/ID_DO_PRODUTO_AQUI`
*   **Body:** Nenhum (vazio).

---

## Governança e Boas Práticas
- **Arquitetura MVC:** O código fonte segue rigorosamente a separação de responsabilidades (Models, Views e Controllers) localizada no diretório `/src`.
- **Prevenção contra Injeção de Código:** Mongoose é utilizado para schema validation e proteção nativa contra ataques de NoSQL Injection, garantindo tipagem estrita de todos os dados salvos no banco.
- **GitFlow:** O ciclo de desenvolvimento adota a estratégia de ramificação, contendo `main` para código de produção estável, `develop` como ambiente central de integração, e `feature/*` branches para a criação isolada de novas tarefas.