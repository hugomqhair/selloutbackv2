const jwt = require("jsonwebtoken");
const cors = require('cors')({ origin: true });
const select = require("./pg/select")
const insert = require("./pg/insert")
const insertArray = require("./pg/insertArray")

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");



const JWTSecret = "@Matrix122221"




// const httpsServer = https.createServer(credentials, app)

exports.select = onRequest(async (req, res) => {
    cors(req, res, async () => {
        let consulta = req.body
        //console.log(consulta)
        res.statusCode = 200;
        let dados = await select(consulta.operacao)
        //console.log('retorno select', consulta.operacao)
        res.json(dados);
    })
});

exports.consulta = onRequest(async (req, res) => {
    cors(req, res, async () => {
    //console.log(req.query, req.params)
    //Esta consulta usa dados da query para buscar na tabela, exemplo http://localhost:3000/consulta?operacao=produto
        let consulta = req.query
        let query
        let isQuery
        if (consulta.operacao == 'loja') {
            query = `SELECT id, nome, idpromoter FROM loja WHERE idpromoter=${req.query.user} ORDER BY nome`
            isQuery = true
        } else if (consulta.operacao == 'resultadomensal') {
            query = `SELECT TO_CHAR(dtmov,'MM/YYYY') AS mes
                        ,sellout.idpromoter
                        ,count(id) as dias
                        ,COALESCE(SUM(qtdneg),0) AS qtdneg
                        ,COALESCE(op.quant,99) AS objetivo
                    FROM sellout
                    LEFT JOIN
                        objetivopromoter op ON TO_CHAR(op.dtref, 'MM/YYYY') = TO_CHAR(sellout.dtmov, 'MM/YYYY') AND op.idpromoter = sellout.idpromoter
                    WHERE sellout.idpromoter=${req.query.user}
                    GROUP BY TO_CHAR(dtmov,'MM/YYYY'), sellout.idpromoter, op.quant
                    ORDER BY TO_CHAR(dtmov,'MM/YYYY') DESC
                    `
            //=${req.query.user}


            isQuery = true
        } else if (consulta.operacao == 'resultadoAdmin') {
            //console.log('params', consulta)
            let filtrarData = `${consulta.ano}-${consulta.mes}-01`
            //console.log(filtrarData)
            //WHERE dtmov BETWEEN  date_trunc('month', current_date) AND (date_trunc('month', current_date) + interval '1 month - 1 day')
            query = `SELECT 
                        (SELECT nome FROM promoter WHERE id=sellout.idpromoter) as promoter
                        ,COALESCE(SUM(qtdneg),0) AS qtdneg
                        ,COUNT(dtmov) AS dias
                        ,COALESCE(op.quant,99) AS objetivo
                    FROM sellout
                    LEFT JOIN objetivopromoter op ON (sellout.idpromoter = op.idpromoter AND TO_CHAR(op.dtref, 'MM/YYYY') = TO_CHAR(sellout.dtmov, 'MM/YYYY'))
                    WHERE dtmov BETWEEN  date_trunc('month',TO_DATE('${filtrarData}','YYYY-MM-DD')) AND (date_trunc('month', TO_DATE('${filtrarData}','YYYY-MM-DD')) + interval '1 month - 1 day')
                    AND sellout.idpromoter NOT IN (SELECT id FROM promoter WHERE gestor=true)
                    GROUP BY sellout.idpromoter,op.quant
                    ORDER BY 2 DESC;`
            isQuery = true
            //console.log(query)
        } else if (consulta.operacao == 'resultadoAdminDetalhe') {
            let filtrarData = `${consulta.ano}-${consulta.mes}-01`
            query = `SELECT 
                        (SELECT nome FROM promoter WHERE id=sellout.idpromoter) as promoter
                        ,sellout.dtmov AS dtmov
                        ,(SELECT nome FROM LOJA WHERE id=sellout.idloja) as loja
                        ,prod.descrprod
                        ,sellite.qtdneg AS qtdneg
                        ,prod.tipo
                        ,sellout.id
                    FROM sellout
                    LEFT JOIN selloutitem sellite ON (sellout.id = sellite.idsellout)
                    LEFT JOIN produto prod ON (prod.id = sellite.idproduto)
                    WHERE dtmov BETWEEN  date_trunc('month',TO_DATE('${filtrarData}','YYYY-MM-DD')) AND (date_trunc('month', TO_DATE('${filtrarData}','YYYY-MM-DD')) + interval '1 month - 1 day')
                    AND sellite.qtdneg >0
                    AND sellout.idpromoter NOT IN (SELECT id FROM promoter WHERE gestor=true)
                    ORDER BY 1,2 DESC;`
            isQuery = true
            //console.log(query)

        } else {
            query = consulta.operacao
            isQuery = false
        }
        let dados = await select(query, isQuery)
        res.statusCode = 200;
        res.json(dados);
    })
});


exports.obterSellouts = onRequest( async (req, res) => {
    cors(req, res, async () => {
        //Esta consulta usa dados da query para buscar na tabela, exemplo http://localhost:3000/consulta?operacao=produto
        let idpromoter = req.query.idpromoter
        res.statusCode = 200;
        let query = `SELECT 
                        sell.id
                        ,sell.dtmov
                        ,TO_CHAR(dtmov,'DD/MM/YYYY') AS fmt_dtmov
                        ,loja.nome as loja
                        ,pro.nome as vend
                        ,sell.qtdneg 
                    FROM sellout as sell 
                    LEFT JOIN promoter pro ON (pro.id = sell.idpromoter) 
                    LEFT JOIN loja ON (sell.idloja = loja.id)
                    WHERE pro.id=${idpromoter} ORDER BY dtmov DESC LIMIT 7;`
        let dados = await select(query, true)
        res.json(dados);
    })
});

exports.loadSelloutitem = onRequest( async (req, res) => {
    cors(req, res, async () => {
        //Esta consulta usa dados da query para buscar na tabela, exemplo http://localhost:3000/consulta?operacao=produto
        let idsellout = req.query.idsellout
        res.statusCode = 200;
        let query = `SELECT 
                        pro.id as idproduto
                        ,fnc_limpa_descrprod(pro.id) as descrprod
                        ,COALESCE((SELECT qtdneg FROM selloutitem WHERE idproduto=pro.id AND idsellout=${idsellout}),0) as qtdneg
                        ,pro.grupo
                        ,COALESCE((SELECT semestoque FROM produtolojaestoque WHERE idproduto=pro.id AND idloja=(SELECT idloja FROM sellout WHERE id=${idsellout})),false) AS semestoque
                        ,COALESCE((SELECT semcadastro FROM produtolojaestoque WHERE idproduto=pro.id AND idloja=(SELECT idloja FROM sellout WHERE id=${idsellout})),false) AS semcadastro
                        ,DENSE_RANK() OVER (ORDER BY grupo) AS idgrupo
                    FROM produto AS pro  ORDER BY grupo, descrprod;`
        let dados = await select(query, true)
        res.json(dados);
    })
});



//Teste
// app.post("/insert", async (req, res) => {
//     var ins = req.body;
//     //console.log(ins)
//     let query = `INSERT INTO TESTE01 (TEXTO, VALOR) VALUES ('${ins.texto}', ${ins.valor});`
//     await insert(query)
//     res.sendStatus(200);
// })

exports.insertSellout = onRequest( async (req, res) => {
    cors(req, res, async () => {
        var ins = req.body;
        //console.log(ins)
        let query = `INSERT INTO sellout (idpromoter, idloja, dtmov) VALUES (${ins.idpromoter}, ${ins.idloja}, '${ins.dtmov}');`
        let dados = await insert(query)
        //console.log(dados)
        if (dados === 1) {
            res.status(200).send('Dia cadastrado com sucesso!')
        } else {
            res.status(401).send(dados)
        }
    })
})


exports.insertSelloutItem = onRequest( async (req, res) => {
    cors(req, res, async () => {
        //console.log(req.body)
        var ins = req.body;
        ins = ins.map(body => ({ idproduto: body.idproduto, idsellout: body.idsellout, qtdneg: body.qtdneg, semcadastro: body.semcadastro, semestoque: body.semestoque }))
        //console.log('body', ins)
        //let {idproduto, idsellout, qtdneg} = Object.keys(ins[0])
        let query = `INSERT INTO selloutitem (idproduto, idsellout,qtdneg, semcadastro, semestoque)
                    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (idproduto, idsellout)
                    DO UPDATE SET qtdneg = $3, semcadastro=$4, semestoque=$5 ;`
        await insertArray(query, ins)
            .then(resp => {
                //console.log('RESP**', resp)
                res.sendStatus(200)
            }).catch(err => res.sendStatus(500))
    })
})


//Insere objetivo promoter
exports.objetivopromoter = onRequest(async (req, res) => {
    cors(req, res, async () => {
        console.log(req.body)
        //var ins = req.body;
        let ins = req.body.map(body => ({ ano: body.ano, mes: body.mes, idpromoter: body.idpromoter, quant: body.quant, dtref: body.dtref }))
        //console.log('body', ins)
        //let {idproduto, idsellout, qtdneg} = Object.keys(ins[0])
        let query = `INSERT INTO objetivopromoter (ano, mes, idpromoter, quant, dtref)
                    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (ano, mes, idpromoter)
                    DO UPDATE SET quant = $4, dtlog=CURRENT_TIMESTAMP ;`
        await insertArray(query, ins)
            .then(resp => {
                //console.log('RESP**', resp)
                res.sendStatus(200)
            }).catch(err => res.sendStatus(500))
    })
})

//UPDATE no cadastro de Produto MQ
exports.produto = onRequest(async (req, res) => {
    cors(req, res, async () => {
        //console.log(req.body)
        //var ins = req.body;
        let ins = req.body.map(body => ({ id: body.id, descrprod:body.descrprod, grupo:body.grupo, tipo: body.tipo }))
        //console.log('body', ins)
        //let {idproduto, idsellout, qtdneg} = Object.keys(ins[0])
        let query = `INSERT INTO produto (id, descrprod, grupo,   dtlog)
                        VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (id)
                        DO UPDATE SET dtlog=CURRENT_TIMESTAMP ;`
        await insertArray(query, ins)
            .then(resp => {
                console.log('UPDATE produto: ', resp)
                res.sendStatus(200)
            }).catch(err => {
                console.error(err)
                res.sendStatus(500)
            })
    })
})


//INSERT PRODSHOPPRECO --NÃO IMPLEMENTADO AINDA
// app.post("/prodshoppreco", async (req, res) => {
//     //console.log('Chegou', req.body)
//     let ins = req.body.map(body => ({ id: body.id, descrprod:body.descrprod, tipo: body.tipo, referencia:body.referencia}))
//     //var ins = req.body;
//     console.log('Produto Shop Preço', ins)
//     //${ins.id}, '${ins.descrprod}','${ins.tipo}', '${ins.sku}'
//     let query = `INSERT INTO prodshoppreco (id, descrprod, tipo, referencia) VALUES ($1,$2,$3,$4)
//                 ON CONFLICT (id) DO UPDATE SET descrprod=$2, tipo=$3, referencia=$4;`
//     await insertArray(query, ins).then(resp =>{
//         //console.log('gravar', resp)
//         res.sendStatus(200);
//     }).catch(err => console.log('ERRO: Gravar Prod Shop Preço!!',err))
// })

//Login

function auth(req, res, next) {
    const authToken = req.headers['authorization'];

    if (authToken != undefined) {

        const bearer = authToken.split(' ');
        var token = bearer[1];

        jwt.verify(token, JWTSecret, (err, data) => {
            if (err) {
                res.status(401);
                res.json({ err: "Token inválido!" });
            } else {

                req.token = token;
                req.loggedUser = { id: data.id, usuario: data.email };
                next();
            }
        });
    } else {
        res.status(401);
        res.json({ err: "Token inválido!" });
    }
}

exports.auth = onRequest(async (req, res) => {
    cors(req, res, async () => {
    var { usuario, senha } = req.body
    usuario = usuario.toUpperCase();

    //console.log('auth', usuario, senha)

    let query = `SELECT id, nome, senha, gestor FROM promoter WHERE UPPER(nome)=UPPER('${usuario}')`

    let DB = {}
    let dados = await select(query, true)
    DB.users = dados

    if (usuario != undefined) {

        //console.log(DB, usuario)
        var user = DB.users.find(u => u.nome == usuario);
        if (user != undefined) {
            if (user.senha == senha) {
                jwt.sign({ id: user.id, usuario: user.nome }, JWTSecret, { expiresIn: '48h' }, (err, token) => {
                    if (err) {
                        res.status(400);
                        res.json({ err: "Falha interna" });
                    } else {
                        res.status(200);
                        //console.log('Token:', {token: token, id:user.id, usuario: user.nome})
                        let loglogin = `INSERT INTO loglogin (idpromoter) VALUES (${user.id});`
                        insert(loglogin)
                        res.json({ token: token, id: user.id, usuario: user.nome, gestor: user.gestor });
                    }
                })
            } else {
                res.status(401);
                res.json({ err: "Credenciais inválidas!" });
            }
        } else {
            res.status(404);
            res.json({ err: "O usuário enviado não existe na base de dados!" });
        }

    } else {
        res.status(400);
        res.send({ err: "O usuário enviado é inválido" });
    }
})
});





//Insere Promoter
exports.promoter = onRequest( async (req, res) => {
    cors(req, res, async () => {
        var ins = req.body;
        console.log(ins)
        let query = `INSERT INTO promoter (id, nome, senha,idger, gestor) VALUES (${ins.id},UPPER('${ins.nome}'), '${ins.senha}', ${ins.idger}, ${ins.gestor})
                    ON CONFLICT(id) DO UPDATE SET nome=UPPER('${ins.nome}'), senha='${ins.senha}',idger=${ins.idger}, gestor=${ins.gestor};`
        await insert(query).then(_ => {
            res.sendStatus(200)
        }) //Falta tratar erros do BD
            .catch(err => {
                console.log('erro insert Promoter', err)
                res.send('err', err)
            })
    })
})

//Insere PromoterLoja
exports.loja = onRequest(async (req, res) => {
    cors(req, res, async () => {
        var ins = req.body;
        ins = ins.map(arr => ({ id: arr.id, idpromoter: arr.idpromoter, nome: arr.nome }))
        console.log(typeof ins, ins)
        let query = `INSERT INTO loja (id, idpromoter, nome ) VALUES ($1, $2, UPPER($3))
                    ON CONFLICT(id) DO UPDATE SET idpromoter=$2, nome=UPPER($3)`
        await insertArray(query, ins).then(_ => {
            res.sendStatus(200)
        }) //Falta tratar erros do BD
            .catch(err => {
                console.log('erro insert Promoter', err)
                res.send('err', err)
            })
    })
})

//Insere Produto
exports.produto = onRequest(async (req, res) => {
    cors(req, res, async () => {
        var ins = req.body;
        //console.log(typeof ins)
        let query = `INSERT INTO produto (descrprod, grupo, id) VALUES (UPPER($1), UPPER($2), $3)
                    ON CONFLICT(id) DO UPDATE SET descrprod=UPPER($1), grupo=UPPER($2);`
        await insertArray(query, ins).then(_ => {
            res.sendStatus(200)
        }) //Falta tratar erros do BD
            .catch(err => {
                console.log('erro insert Promoter', err)
                res.send('err', err)
            })
    })        
})


//apenas testes
exports.teste = onRequest(async (req, res) => {
    var ins = req.body;
    console.log(ins)
    if (ins) {
        res.status(200)
        res.send({ info: "Legal Chegou" })
    } else {
        res.status(400)
        res.send({ info: "Eroo" })
    }
})

