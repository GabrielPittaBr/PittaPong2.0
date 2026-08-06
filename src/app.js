const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const conectarDB = require('./config/db');
const produtoRoutes = require('./routes/productRoutes');
const usuarioRoutes = require('./routes/userRoutes');
const pagesController = require('./controllers/pagesControllers');
const productController = require('./controllers/productControllers');
const optionalAuth = require('./middlewares/optionalAuth');

const app = express();

// Em produção o Render termina o TLS no proxy e encaminha por HTTP interno.
// Sem isso o Express considera a requisição insegura e não envia cookies `secure`.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Populate user info on every page request (non-blocking)
app.use(optionalAuth);

// ── Health check (sem consulta ao banco) ──
app.get('/health', (req, res) => res.status(200).send('ok'));

// ── API de produtos (JSON) ──
app.use('/produtos', produtoRoutes);

// ── Rotas de usuário (login/cadastro/logout) ──
app.use('/usuario', usuarioRoutes);

// ── Rotas de páginas ──
app.get('/', pagesController.getHome);
app.get('/vender', (req, res, next) => {
  if (!req.userId) return res.redirect('/login');
  next();
}, productController.getVender);
app.get('/produtos/listar', pagesController.getListarProdutos);
app.get('/produto/:id', pagesController.getProdutoDetalhe);
app.get('/carrinho', pagesController.getCarrinho);
app.get('/checkout', pagesController.getCheckout);
app.get('/acompanhamento', pagesController.getAcompanhamento);
app.get('/login', pagesController.getLogin);
app.get('/cadastro', pagesController.getCadastro);
app.get('/editar-produto/:id', pagesController.getEditarProduto);

// Conectar ao MongoDB e iniciar servidor
conectarDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}).catch((err) => {
  console.error("Falha ao iniciar a aplicação:", err.message);
  process.exit(1);
});