const { Client } = require('pg');

// Configuração da conexão com o PostgreSQL
const config = {
    user: 'postgres',
    host: 'localhost',
    database: 'teste',
    password: 'postgres',
    port: 5432, // Porta padrão do PostgreSQLQL
};

// Função para realizar a consulta e retornar os dados
module.exports =
async function consultarDados() {
  // Crie uma instância do cliente PostgreSQL
  const client = new Client(config);

  try {
    // Conecte-se ao banco de dados
    await client.connect();

    // Consulta SQL para selecionar os dados da tabela
    const query = 'SELECT * FROM teste01';

    // Executa a consulta
    const resultado = await client.query(query);

    // Exibe os dados retornados
    console.log('Dados retornados da consulta:');
    // resultado.rows.forEach((row, index) => {
    //   console.log(`Registro ${index + 1}:`, row);
    // });
    return resultado.rows
  } catch (err) {
    console.error('Erro ao consultar dados:', err);
  } finally {
    // Fecha a conexão com o banco de dados
    await client.end();
  }
}


// Chama a função para consultar e retornar os dados
//consultarDados();
