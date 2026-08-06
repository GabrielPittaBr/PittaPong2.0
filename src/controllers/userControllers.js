const Usuario = require('../models/userModels');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// `secure` só em produção: em http://localhost o cookie precisa trafegar sem TLS
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
};

exports.register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.redirect('/cadastro?erro=' + encodeURIComponent('Email já cadastrado'));
    }

    const hash = await bcrypt.hash(senha, 10);

    const usuario = new Usuario({
      nome,
      email,
      senha: hash
    });

    await usuario.save();

    // Auto-login after registration: generate token and set cookie
    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.redirect('/');
  } catch (err) {
    res.redirect('/cadastro?erro=' + encodeURIComponent(err.message));
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.redirect('/login?erro=' + encodeURIComponent('Usuário não encontrado'));
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.redirect('/login?erro=' + encodeURIComponent('Senha inválida'));
    }

    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.redirect('/');
  } catch (err) {
    res.redirect('/login?erro=' + encodeURIComponent(err.message));
  }
};

exports.logout = (req, res) => {
  // Atributos precisam bater com os do res.cookie, senão o navegador não remove
  res.clearCookie('token', cookieOptions);
  res.redirect('/');
};