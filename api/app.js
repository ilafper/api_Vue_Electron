const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcryptjs");
const app = express();
app.use(express.json());

const uri ="mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority";
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
    console.log(lista_usuarios);
    
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

app.get("/api/eventos", async (req, res) => {
  try {
    const { eventos } = await connectToMongoDB();
    // Excluir el campo contraseña de la respuesta
    const lista_eventos = await eventos.find().toArray();

    // Formatear fechas a YYYY-MM-DD
    const todos_eventos = lista_eventos.map(cada_fecha => ({
      ...cada_fecha,
      fecha: cada_fecha.fecha.split('T')[0],
    }));

    res.json({ success: true, todos_eventos });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los eventos" });
  }
});

// Crear usuario NUEVo

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

    // Hashear la nueva contraseña con baicrip
    const saltRounds = 10;

    const contraseñaHasheada = await bcrypt.hash(contraseña, saltRounds);

    const rol = "user";

    let codigo_user = 'Codigo'+ Math.floor(Math.random() * 1000);
    let code_user = codigo_user.toString();

    // Crear objeto de usuario
    const nuevoUsuario = {
      nombre,
      apellidos,
      correo,
      contraseña: contraseñaHasheada,
      rol,
      code_user
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
        rol
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
    //compararr la contraseña con brypcrip 
    const contraseñaValida = await bcrypt.compare(
      contraseña,
      usuario.contraseña,
    );

    if (!usuario || !contraseñaValida) {
      console.log("Usuario no encontrado o contraseña incorrecta");
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
        code_user:usuario.code_user
      },
    };

    res.json(respuesta);
    console.log(respuesta);
    
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
      fecha,
      horaInicio,
      horaFin
    } = req.body;

    // Validar campos requeridos
    if (!nombreEvento || !descripcionEvento || !plazasTotales || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ error: "faltan campos en los eventos" });
    }

    // Normalizar nombre para búsqueda
    const nombreEventoNormalizado = nombreEvento.trim().toLowerCase();
    
    // Buscar por nombre normalizado (case insensitive)
    const eventoExistente = await eventos.findOne({
      nombreEvento: { $regex: new RegExp(`^${nombreEventoNormalizado}$`, 'i') }
    });

    if (eventoExistente) {
      console.log("Ya existe un evento con este nombre:", eventoExistente.nombreEvento);
      return res.status(409).json({ 
        error: "nombre evento duplicado",
        detalle: `Ya existe el evento "${eventoExistente.nombreEvento}"`
      });
    }

    // Validar horas
    if (horaFin <= horaInicio) {
      return res.status(400).json({
        error: "la hora fin debe ser mayor a la de inicio",
      });
    }

    // Generar código único (mejor usar timestamp para evitar duplicados)
    const code_Evento = 'Codigo' + Math.floor(Math.random() * 1000);

    // Crear objeto del evento
    const eventoNuevo = {
      nombreEvento: nombreEvento.trim(),
      descripcionEvento,
      plazasTotales: Number(plazasTotales),
      PlazasDisponibles: Number(plazasTotales),
      fecha: new Date(fecha + "T00:00:00.000Z").toISOString(),
      horaInicio,
      horaFin,
      code_Evento,
      estado: "libre"
    };

    console.log("evento nuevo:", eventoNuevo);
    
    const resultado = await eventos.insertOne(eventoNuevo);

    res.status(201).json({
      mensaje: "evento CREADO",
      id: resultado.insertedId,
      eventoNuevo
    });

  } catch (error) {
    console.error("Error al crear eventos:", error);
    res.status(500).json({ 
      error: "Error interno del servidor",
      detalle: error.message 
    });
  }
});




//eliminar evento.



app.delete("/api/eliminarEvento/:id", async (req, res) => {
  const { eventos } = await connectToMongoDB();

  try {
    const id_eliminar = req.params.id;

    const resultado = await eventos.deleteOne({ code_Evento: id_eliminar});

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: "No se encontró el documento" });
    }

    res.json({ mensaje: "evento eliminado correctamente" });

  } catch (error) {
    res.status(500).json({ error: "Error al eliminar", detalle: error.message });
  }
});

// modificar evento
app.put("/api/modievento", async (req, res) => {
  const { eventos, reservas } = await connectToMongoDB();

  try {
    const eventoActualizado = req.body;
    const { code_Evento, plazasTotales, ...otrosDatos } = eventoActualizado;
    
    // 2. Calcular cuántas reservas hay
    const reservasCount = await reservas.countDocuments({ 
      code_Evento: code_Evento,
      estado: 'confirmada' 
    });

    // 3. Calcular nuevas plazas disponibles
    const nuevasPlazasDisponibles = plazasTotales - reservasCount;

    // 4. Validar que no sea negativo
    if (nuevasPlazasDisponibles < 0) {
      return res.status(400).json({ 
        mensaje: `No se pueden reducir las plazas. Hay ${reservasCount} reservas confirmadas.` 
      });
    }

    // 5. Actualizar con las nuevas plazas disponibles
    const resultado = await eventos.updateOne(
      { code_Evento },
      { 
        $set: {
          plazasTotales,
          PlazasDisponibles: nuevasPlazasDisponibles,
          ...otrosDatos
        }
      }
    );

    res.json({ 
      mensaje: "Evento actualizado correctamente",
      plazasDisponibles: nuevasPlazasDisponibles
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// crear reservas  



app.post("/api/crearreserva", async (req, res) => {
  try {
    //recibir la resrerva
    const { reservas, eventos } = await connectToMongoDB();


    const { reserva_nueva } = req.body;

    console.log("Datos reserva:", reserva_nueva);
    
    // comprobar si existe el evento de la reservaa
    const existeEvento = await eventos.findOne({
      code_Evento: reserva_nueva.codigo_evento
    });

    console.log("Evento encontrado:", existeEvento);

    //error si no existe
    if (!existeEvento) {
      console.log("Evento no encontrado");
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    
    // en el caso de que llegue a 0
    if (existeEvento.PlazasDisponibles <= 0) {
      
      return res.status(400).json({
        error: "No hay plazas disponibles para este evento",
        plazasDisponibles: existeEvento.PlazasDisponibles,
      });
    }

    //pasar la fecha de la reserva a toisoString ya que viene 2026-12-12
    reserva_nueva.fecha = new Date().toISOString();
 
    const resultado = await reservas.insertOne(reserva_nueva);
    console.log("Reserva creada:", resultado.insertedId);
    
    //actualizar el numero de plazas disponible sdel evento
    // Otra opción más simple: verificar después de actualizar
     await eventos.updateOne(
       { code_Evento: reserva_nueva.codigo_evento },
       { $inc: { PlazasDisponibles: -1 } }
     );
     
     const eventoTrasActualizar = await eventos.findOne({
       code_Evento: reserva_nueva.codigo_evento
     });
     
     if (eventoTrasActualizar.PlazasDisponibles === 0) {
       await eventos.updateOne(
         { code_Evento: reserva_nueva.codigo_evento },
         { $set: { estado: "ocupado" } }
       );
     }


    console.log("Plaza restada. Nuevas disponibles:", existeEvento.PlazasDisponibles - 1);

    const respuesta = {
      mensaje: "Reserva creada correctamente",
      datos: reserva_nueva,
      plazasRestantes: existeEvento.PlazasDisponibles - 1
    };

    res.status(201).json(respuesta);
    console.log("Respuesta:", respuesta);
    
  } catch (error) {
    console.error("Error al crear reserva:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});




module.exports = app;
