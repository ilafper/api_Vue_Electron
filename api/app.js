const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const app = express();
app.use(express.json());

const uri = "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority"; //
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("ESta conectado, Go go go go");
    const db = client.db('Api_Vue');
    return {
      usuarios: db.collection('usuarios'),
    };
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    throw new Error('Error al conectar a la base de datos');
  }
}

//Obtener todos los usuarios

app.get('/api/usuarios', async (req, res) => {
  try {
    const { usuarios } = await connectToMongoDB();
    const lista_products = await usuarios.find().toArray();
    res.json(lista_products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

//Crear usuarios
app.post('/api/crearusuario', async (req, res) => {
  const nuevoUsuario = req.body;
  try {
    const { usuarios } = await connectToMongoDB();
    const resultado = await usuarios.insertOne(nuevoUsuario);
    console.log(`USUARIO creado con ID: ${resultado.insertedId}`);
    res.status(201).json({ mensaje: "Usuario creado", id: resultado.insertedId });
  } catch (error) {
    console.error("Error al guardar el usuario en MongoDB:", error);
    res.status(500).json({ error: 'Error interno del servidor al crear el usuario' });
  }

});









module.exports = app;