const { Pool } = require('pg');
const param = require("./param")
const config = param

// Configuração da conexão com o PostgreSQL
// const config = {
//   user: 'sellout',      // seu usuário PostgreSQL
//   host: 'sellout.postgresql.dbaas.com.br',
//   database: 'sellout',   // nome do banco de dados
//   password: 'MQHair@765',    // senha do usuário
//   port: 5432,       
//   };


module.exports=
async function insertRecords(query, records) {
  const pool = new Pool(config);
  const client = await pool.connect();
  let resultado = 0
  try {
    // Cria a conexão com o banco de dados

    // Inicia uma transação
    await client.query('BEGIN');

    // Cria o comando SQL de inserção utilizando o array de registros
    const insertQuery =  query
    
    let resp
    for (const record of records) {
      //console.log(query, Object.values(record))
      resp = await client.query(insertQuery, Object.values(record));
      resultado += resp.rowCount
    }
    // Finaliza a transação com commit
    let resp2 = await client.query('COMMIT');
    //console.log('Registros inseridos com sucesso!');
    //console.log(resp2)
  } catch (err) {
    // Caso ocorra algum erro, desfaz a transação
    await client.query('ROLLBACK');
    console.error('Erro ao inserir registros:', err);
  } finally {
    // Fecha a conexão com o banco de dados 
    //console.log('Fecha a conexão com o banco de dados')
    pool.end();
    client.release();
  }
}

// Chama a função para inserir os registros
//insertRecords();
