const { Client } = require('pg');
const param = require("./param")

const config = param

//console.log('BD', config)


// Configuração da conexão com o PostgreSQL
// const config = {
//   user: 'sellout',      // seu usuário PostgreSQL
//   host: 'sellout.postgresql.dbaas.com.br',
//   database: 'sellout',   // nome do banco de dados
//   password: 'MQHair@765',    // senha do usuário
//   port: 5432,       
// };

// Função para gravar dados no banco de dados
module.exports = 
async function gravarDados(qry) {
    // Crie uma instância do cliente PostgreSQL
    const client = new Client(config);
  
    try {
      // Conecte-se ao banco de dados
      await client.connect();
  
  
      // Consulta SQL para inserir os dados na tabela
      //const query = 'INSERT INTO teste01 (texto, dtlog)  VALUES ($1, CURRENT_DATE) RETURNING *';
      const query = qry
      // Executa a consulta passando os dados como parâmetros
      const resultado = await client.query(query, []);
  
      // Exibe o resultado
      //console.log('Dados gravados com sucesso:', resultado.rowCount);
      return await resultado.rowCount
    } catch (err) {
        if(err.detail==' undefined'){
          return await 'Erro no Banco de Dados'
        } else {
          return await err.detail
        }
    } finally {
      // Fecha a conexão com o banco de dados
      await client.end();
    }
  }
  
  // Chama a função para gravar os dados
  //gravarDados();