const mongoose = require('mongoose');

const conectarDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error("Erro: a variável de ambiente MONGO_URI não está definida.");
        process.exit(1);
    }

    try {
        // Timeout curto: erro de Network Access no Atlas falha rápido, com mensagem útil
        const conexao = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

        // Loga host e banco, nunca a URI completa (que contém a senha)
        const { host, name } = conexao.connection;
        console.log(`Conectado ao MongoDB com sucesso! (${host}/${name})`);
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error.message);
        process.exit(1); // Encerra a aplicação
    }

    // Quedas depois do boot precisam aparecer no log, senão as requisições só penduram
    mongoose.connection.on('error', (err) => {
        console.error("Erro na conexão com o MongoDB:", err.message);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn("Conexão com o MongoDB perdida.");
    });
};

module.exports = conectarDB;
