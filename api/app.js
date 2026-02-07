const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
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


// Obtener todos los usuarios (sin contraseñas)
app.get('/api/usuarios', async (req, res) => {
  try {
    const { usuarios } = await connectToMongoDB();
    // Excluir el campo contraseña de la respuesta
    const lista_usuarios = await usuarios.find({}, { projection: { contraseña: 0 } }).toArray();
    res.json(lista_usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

// Crear usuario NUEVO
app.post('/api/crearusuario', async (req, res) => {
  try {
    const { nombre, apellidos, correo, contraseña, rol } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !apellidos || !correo || !contraseña || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    
    // Verificar si el correo ya existe
    const { usuarios } = await connectToMongoDB();
    const usuarioExistente = await usuarios.findOne({ correo });
    
    if (usuarioExistente) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    
    // Hashear la nueva contraseña con bcryptjs (compatible con bcrypt)
    const saltRounds = 10;

    const contraseñaHasheada = await bcrypt.hash(contraseña, saltRounds);
    
    // Crear objeto de usuario
    const nuevoUsuario = {
      nombre,
      apellidos,
      correo,
      contraseña: contraseñaHasheada,
      rol
    };
    
    // Insertar en la base de datos
    const resultado = await usuarios.insertOne(nuevoUsuario);
    
    // Respuesta sin contraseña
    const respuesta = {
      mensaje: "Usuario creado exitosamente",
      id: resultado.insertedId,
      usuario: {
        nombre,
        apellidos,
        correo,
        rol,
        fechaCreacion: nuevoUsuario.fechaCreacion
      }
    };
    
    res.status(201).json(respuesta);
    
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



app.post('/api/login', async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    
    console.log('Intentando login para:', correo);
    

    if (!correo || !contraseña) {
      return res.status(400).json({ 
        success: false, 
        message: 'Correo y contraseña son obligatorios' 
      });
    }
    
    // Conectar a MongoDB
    const { usuarios } = await connectToMongoDB();
    
    // Buscar usuario por correo
    const usuario = await usuarios.findOne({ correo });
    
    if (!usuario) {
      console.log('Usuario no encontrado:', correo);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    // Verificar contraseña con bcrypt
    const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);
    
    if (!contraseñaValida) {
      console.log('❌ Contraseña incorrecta para:', correo);
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    console.log('✅ Login exitoso para:', usuario.nombre);
    
    // Crear respuesta (sin contraseña)
    const respuesta = {
      success: true,
      user: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol
      },
      // Podrías agregar un token JWT aquí si quieres
      token: 'jwt_simulado_' + Date.now()
    };
    
    res.json(respuesta);
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});























module.exports = app;