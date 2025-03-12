const { Client } = require('pg');

// Configuração da conexão com o PostgreSQL
const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'teste',
  password: 'postgres',
  port: 5432, // Porta padrão do PostgreSQL
};




// Função para gravar dados no banco de dados
module.exports = 
async function gravarDados(dados) {
    // Crie uma instância do cliente PostgreSQL
    const client = new Client(config);
  
    try {
      // Conecte-se ao banco de dados
      await client.connect();
  
  
      // Consulta SQL para inserir os dados na tabela
      const query = 'INSERT INTO teste01 (texto, dtlog)  VALUES ($1, CURRENT_DATE) RETURNING *';
  
      // Executa a consulta passando os dados como parâmetros
      const resultado = await client.query(query, [dados]);
  
      // Exibe o resultado
      console.log('Dados gravados com sucesso:', resultado.rows[0]);
      return await resultado.rows[0]
    } catch (err) {
      console.error('Erro ao gravar dados:', err);
    } finally {
      // Fecha a conexão com o banco de dados
      await client.end();
    }
  }
  
  // Chama a função para gravar os dados
  //gravarDados();