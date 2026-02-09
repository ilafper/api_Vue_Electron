const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const app = express();
app.use(express.json());

const uri =
  "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority"; //
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("ESta conectado, Go go go go");
    const db = client.db("Api_Vue");
    return {
      usuarios: db.collection("usuarios"),
      eventos: db.collection("eventos"),
      reservas: db.collection("reservas"),
    };
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    throw new Error("Error al conectar a la base de datos");
  }
}

// Obtener todos los usuarios (sin contraseñas)
app.get("/api/usuarios", async (req, res) => {
  try {
    const { usuarios } = await connectToMongoDB();
    // Excluir el campo contraseña de la respuesta
    const lista_usuarios = await usuarios
      .find({}, { projection: { contraseña: 0 } })
      .toArray();
    res.json(lista_usuarios);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

app.get("/api/eventos", async (req, res) => {
  try {
    const { eventos } = await connectToMongoDB();
    // Excluir el campo contraseña de la respuesta
    const lista_eventos = await eventos.find().toArray();
    res.json(lista_eventos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los eventos" });
  }
});

// Crear usuario NUEVO

app.post("/api/crearusuario", async (req, res) => {
  try {
    const { nombre, apellidos, correo, contraseña, contraseña2 } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellidos || !correo || !contraseña || !contraseña2) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    // Verificar si el correo ya existe
    const { usuarios } = await connectToMongoDB();
    // evitar correo duplicados
    const usuarioExistente = await usuarios.findOne({ correo });

    if (usuarioExistente) {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    if (contraseña !== contraseña2) {
      console.log("las contraseña no coinciden");
      return res.status().json({ error: "las contrsaeñas no coinciden" });
    }

    // Hashear la nueva contraseña con bcryptjs (compatible con bcrypt)
    const saltRounds = 10;

    const contraseñaHasheada = await bcrypt.hash(contraseña, saltRounds);

    const rol = "user";

    // Crear objeto de usuario
    const nuevoUsuario = {
      nombre,
      apellidos,
      correo,
      contraseña: contraseñaHasheada,
      rol,
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
        fechaCreacion: nuevoUsuario.fechaCreacion,
      },
    };

    res.status(201).json(respuesta);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    console.log("Intentando login para:", correo);

    if (!correo || !contraseña) {
      return res.status(400).json({
        success: false,
        message: "Correo y contraseña son requeridos",
      });
    }

    // Conectar a MongoDB
    const { usuarios } = await connectToMongoDB();

    // Buscar usuario por correo

    const usuario = await usuarios.findOne({ correo });
    const contraseñaValida = await bcrypt.compare(
      contraseña,
      usuario.contraseña,
    );
    if (!usuario || !contraseñaValida) {
      console.log("Usuario no encontrado o contraseña incorrecta:", correo);
      return res.status(401).json({
        success: false,
        message: "correo o contraseña incorrectas",
      });
    }

    console.log("Login exitoso para:", usuario.nombre);

    // Crear respuesta (sin contraseña)
    const respuesta = {
      success: true,
      user: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };

    res.json(respuesta);
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Login nonono",
    });
  }
});

//endpoint creear evento
app.post("/api/creareventos", async (req, res) => {
  try {
    const { eventos } = await connectToMongoDB();
    const {
      nombreEvento,
      descripcionEvento,
      plazasTotales,
      fechaInicio,
      fechaFin,
    } = req.body;

    // Validar campos requeridos
    if (
      !nombreEvento ||
      !descripcionEvento ||
      !plazasTotales ||
      !fechaInicio ||
      !fechaFin
    ) {
      return res.status(400).json({ error: "faltan campos en los eventos" });
    }

    // CORRECCIÓN: nombreEvento ya es string, no necesita .nombreEvento
    let nombreEventoMinus = nombreEvento.trim().toLowerCase();
    console.log("Buscando evento:", nombreEventoMinus);

    // CORRECCIÓN: Buscar con regex case-insensitive
    const eventoExistente = await eventos.findOne({
      nombreEvento: nombreEventoMinus
    });

    if (eventoExistente) {
      console.log("Ya existe un evento con este nombre:", eventoExistente.nombreEvento);
      return res.status(409).json({ 
        error: "nombre evento duplicado",
        detalle: `Ya existe el evento "${eventoExistente.nombreEvento}"`
      });
    }

    const fechaInicioDate = new Date(fechaInicio + "T00:00:00.000Z");
    const fechaFinDate = new Date(fechaFin + "T23:59:59.999Z");

    if (fechaFinDate < fechaInicioDate) {
      return res.status(400).json({
        error: "la fecha fin no puede ser anterior a la fecha inicio",
      });
    }

    

    let codigo_evento = nombreEvento + Math.floor(Math.random() * 10000000000);
    let code_Evento = codigo_evento.toString();
    console.log("Código evento Propio:", code_Evento);

    // Crear objeto del evento
    const eventoNuevo = {
      nombreEvento: nombreEvento.trim(), // Guardar sin espacios extras
      descripcionEvento,
      plazasTotales: Number(plazasTotales),
      PlazasDisponibles: Number(plazasTotales),
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      code_Evento,
      createdAt: new Date()
    };

    // Insertar en la base de datos
    const resultado = await eventos.insertOne(eventoNuevo);

    // Respuesta
    const respuesta = {
      mensaje: "evento CREADO",
      id: resultado.insertedId,
      eventoNuevo: {
        nombreEvento: nombreEvento,
        descripcionEvento,
        plazasTotales: Number(plazasTotales),
        PlazasDisponibles: Number(plazasTotales),
        code_Evento,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaInicioISO: fechaInicioDate.toISOString(),
        fechaFinISO: fechaFinDate.toISOString()
      },
    };

    res.status(201).json(respuesta);
  } catch (error) {
    console.error("Error al crear eventos:", error);
    console.error("Stack trace:", error.stack); 
    res.status(500).json({ 
      error: "Error interno del servidor",
      detalle: error.message 
    });
  }
});

module.exports = app;
