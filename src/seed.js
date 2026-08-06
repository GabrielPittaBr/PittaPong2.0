require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Produto = require('./models/productModels');
const Usuario = require('./models/userModels');

const produtos = [
  {
    nome: 'Olden Racket',
    preco: 229.99,
    descricao: 'Desbloqueie seu verdadeiro potencial com essa mega raquete. Usada pelo profissional Oldenburg no Torneio 20x CIMOL.',
    categoria: 'Raquetes',
    imagens: ['/img/Olden Racket.png', 'https://res.cloudinary.com/do3wgxuwp/image/upload/v1778027335/OldenRacket2.png', '/img/Olden Racket.png', 'https://res.cloudinary.com/do3wgxuwp/image/upload/v1778027335/OldenRacket2.png']
  },
  {
    nome: 'Roiesk Balls',
    preco: 39.99,
    descricao: 'Bolinhas de tênis de mesa profissionais da Roiesk. Perfeitas para treino e competição, com qualidade e durabilidade garantidas.',
    categoria: 'Bolinhas',
    imagens: ['/img/Roiesk Balls.png', 'https://res.cloudinary.com/do3wgxuwp/image/upload/v1778027360/RoieskBall2.png', '/img/Roiesk Balls.png', 'https://res.cloudinary.com/do3wgxuwp/image/upload/v1778027360/RoieskBall2.png']
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    let pittaPongUser = await Usuario.findOne({ email: 'pittapong@pittapong.com' });
    if (!pittaPongUser) {
      // Em produção defina SEED_USER_PASSWORD — o fallback está num repositório público
      const senhaSemente = process.env.SEED_USER_PASSWORD || 'PittaPong123!';
      const hashedPassword = await bcrypt.hash(senhaSemente, 10);
      pittaPongUser = new Usuario({
        nome: 'PittaPong',
        email: 'pittapong@pittapong.com',
        senha: hashedPassword
      });
      await pittaPongUser.save();
      console.log('✅ Usuário PittaPong criado com sucesso');
    } else {
      console.log('ℹ️  Usuário PittaPong já existente');
    }

    for (const dados of produtos) {
      const existe = await Produto.findOne({ nome: dados.nome });
      if (!existe) {
        const dadosComUsuario = { ...dados, usuario: pittaPongUser._id };
        const p = new Produto(dadosComUsuario);
        await p.save();
        console.log(`✅ Produto criado: ${dados.nome}`);
      } else {
        console.log(`⚠️  Produto já existe: ${dados.nome}`);
      }
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

seed();
