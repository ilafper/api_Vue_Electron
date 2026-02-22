const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcryptjs");
//zod 
const { z, success, json } = require('zod');
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




// Obtener todos los usuarios
app.get("/api/usuarios", async (req, res) => {
  try {
    const { usuarios } = await connectToMongoDB();
    // Excluir el campo contraseña de la respuesta
    const lista_usuarios = await usuarios.find({}, { projection: { contraseña: 0 } }).toArray();
    res.json(lista_usuarios);
    console.log(lista_usuarios);
    
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});


app.get("/api/eventos", async (req, res) => {
  try {

    const { eventos } = await connectToMongoDB();
    const lista_eventos = await eventos.find().toArray();
    //fecha actual de hoy al cargar los eventos
    let fechaActu = new Date();
    
    // recorrer
    for (let cada_evento  of lista_eventos) {
      //comprobar la fechas de cada evento
      const fechaEvento = new Date(cada_evento.fecha);
      console.log("fecha evento:", fechaEvento);
      let estadoActu= "";
      console.log("Fecha actual:", fechaActu);
      
      //comprobar
      if (fechaEvento > fechaActu) {
          estadoActu="libre";
      } else if (fechaEvento < fechaActu) {
          estadoActu="finalizado";
      } else {
       
      }
      // ver si cambio
      if (cada_evento.estado != estadoActu) {
        console.log("cambio cambio");
        //actualizar
        eventos.updateOne(
          {code_Evento:cada_evento.code_Evento},
          {$set:{estado: estadoActu}} 

        );
      }
    }

    const eventos_actualizados = await eventos.find().toArray();
    
    // formatear fecha al enviar
    const list_eventos = eventos_actualizados.map(cada_evento => ({
      ...cada_evento,
      fecha: cada_evento.fecha.split('T')[0]
    }));
    //acuerdate de retocar en la de movil la lista.
    res.json({ success: true, list_eventos });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los eventos" });
  }
});




// todas las reservas
app.get("/api/reservas", async (req, res) => {
  try {
    const { reservas } = await connectToMongoDB();
    // Excluir el campo contraseña de la respuesta
    const lista_todas_reservas = await reservas.find().toArray();
    res.json({ success: true, lista_todas_reservas });
    console.log("sisis todas reservas");
    
    console.log(lista_todas_reservas);
    
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las reservas" });
  }
});

// Crear usuario NUEVo
app.post("/api/crearusuario", async (req, res) => {
  try {

    const { nombre, apellidos, correo, contraseña, contraseña2 } = req.body;

    const { usuarios } = await connectToMongoDB();
    // validacion con zod

    const resultado = z.object({
      nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
      apellidos: z.string().min(3, "Los apellidos deben tener al menos 3 caracteres"),
      correo: z.email("Correo electrónico inválido"), 
      contraseña: z.string().min(3, "La contraseña debe tener al menos 3 caracteres"),
      contraseña2: z.string().min(3, "La contraseña debe tener al menos 3 caracteres")
      //validaciones personalizadas en vez de las .min que son predefinidas de zod
    }).refine(data => data.contraseña === data.contraseña2, {
      message: "Las contraseñas no coinciden",
      path: ["contraseña2"]
      
    }).safeParse({ nombre, apellidos, correo, contraseña, contraseña2 });

     if (!resultado.success) {
      console.log("sisis zod");
      const primerError = resultado.error?.issues?.[0]?.message;
      console.log(primerError);
      
      return res.status(400).json({
        success: false,
        message: primerError  
      });
    }


    // Verificar contraseñas
    if (contraseña !== contraseña2) {
      return res.status(400).json({ 
        success: false,
        message: "Las contraseñas no coinciden" 
      });
    }

    // Verificar correo duplicado
    const usuarioExistente = await usuarios.findOne({ correo });
    if (usuarioExistente) {
      return res.status(409).json({ 
        success: false,
        message: "El correo ya está registrado" 
      });
    }


    // Hashear contraseña
    const saltRounds = 10;

    const contraseñaHasheada = await bcrypt.hash(contraseña, saltRounds);

    const code_user = 'Codigo' + Math.floor(Math.random() * 1000);

    const nuevoUsuario = {
      nombre,
      apellidos,
      correo,
      contraseña: contraseñaHasheada,
      rol: "user",
      code_user
    };

    await usuarios.insertOne(nuevoUsuario);

    // devolver respuesta 
    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      user: {
        nombre,
        apellidos,
        correo,
        code_user
      }
    });

  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor" 
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    console.log("Intentando login para:", correo);

    // Conectar a MongoDB
    const { usuarios } = await connectToMongoDB();

    //buscar usuario
    const usuario = await usuarios.findOne({ correo });

    // si existe usuario
    if (!usuario) {
      console.log("Usuario no encontrado");
      return res.status(401).json({
        success: false,
        message: "No existe este usuario, crea uno",
      });
    }

    // comparar contraseñas con bcrypt
    const contraseñaValida = await bcrypt.compare(
      contraseña,
      usuario.contraseña
    );


    if (!contraseñaValida) {
      console.log("Contraseña incorrecta");
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectas",
      });
    }

    console.log("Login exitoso para:", usuario.nombre);

    
    const respuesta = {
      success: true,
      message:"Inicio Sesion Exitoso",
      user: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        code_user: usuario.code_user
      },
    };

    res.json(respuesta);
    
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

//endpoint creear evento

app.post("/api/creareventos", async (req, res) => {
  try {
    const { eventos } = await connectToMongoDB();
    const {
      nombreEvento,
      plazasTotales,
      fecha,
      horaInicio,
      horaFin
    } = req.body;


    console.log(nombreEvento,plazasTotales,fecha,horaInicio,horaFin);
    
    // Validar campos requeridos
    if (!nombreEvento || !plazasTotales || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ error: "faltan campos en los eventos" });
    }

    // Normalizar nombre para búsqueda
    const nombreMinus = nombreEvento.trim().toLowerCase();
    
    // Buscar por nombre si hay duplicados
    const eventoExistente = await eventos.findOne({
      nombreEvento:nombreMinus
    });

    if (eventoExistente) {
      console.log("Ya existe un evento con este nombre:", eventoExistente.nombreEvento);
      return res.status(409).json({ 
        success:false,
        error: "Nombre evento duplicado",

      });
    }

    // node jar meter fecha anterior a la actual

    let fechaActual= new Date().setHours(0,0,0,0);

    console.log("fecha actual crear evfento",fechaActual);
    
    let fecha_nueva= new Date(fecha);

    if (fechaActual > fecha_nueva ) {
      console.log("no fecha valida, antigua");
      return res.status(400).json({
        success:false,
        error: "no puedes crear un evento anterior a la fecha actual",
      });

    }else{

    }

    // validar horas
    if (horaFin <= horaInicio) {
      return res.status(400).json({
        success:false,
        error: "la hora fin debe ser mayor a la de inicio",
      });
    }

    // Generar codigo evento
    const code_Evento = 'Codigo' + Math.floor(Math.random() * 1000);

     // Crear objeto del evento
     const eventoNuevo = {
       nombreEvento: nombreEvento.trim(),
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
       success:true,
       mensaje: "evento creado correctamente",
       evento_evento:resultado
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
  const { reservas } = await connectToMongoDB();

  try {
    const id_eliminar = req.params.id;
    console.log(id_eliminar);
    
    //borrar el borrar y su e vento
    const resultado = await eventos.deleteOne({ code_Evento: id_eliminar});

    // borrar todas las reservas de ese eventos de la coleccion
    const reservasEliminadas = await reservas.deleteMany({ codigo_evento: id_eliminar });
    console.log("resservas eliminadas",reservasEliminadas);
    
    if (resultado.deletedCount === 0 ) {
      return res.status(404).json({success:false, error: "No se encontro el evento" });
    }

    res.json({success:true, mensaje: "Evento " + id_eliminar + "eliminado correctamente" });

  } catch (error) {
    res.status(500).json({ error: "Error al eliminar", detalle: error.message });
  }
});




// modificar evento
app.put("/api/modievento", async (req, res) => {
  const { eventos, reservas } = await connectToMongoDB();

  try {
    //acuerdate de la fechas


    const eventoActualizado = req.body;
    console.log("eventos datos a actualizar", eventoActualizado);
    //const { code_Evento, plazasTotales, ...otrosDatos } = eventoActualizado;

    //separar codigo del resto de datos

    
    console.log("codifo", eventoActualizado.code_evento);
    
    
    
    // encontrar evento
    const eventoExiste = await eventos.findOne({ code_Evento: eventoActualizado.code_evento });

    if(!eventoExiste){
       return res.status(404).json({success:false, error: "Evento no encontrado" });
    }
    console.log("even to existe",eventoExiste);
    
    //Seguimso
    console.log("hhhaha");



    
    //no dejar meter fecha anterior a la que habia.
    if(eventoActualizado.fechaDate){
      const fechaEventoActual= eventoExiste.fecha;
      const fechaNuevaModi=  new Date(eventoActualizado.fechaDate) ;

      console.log("fecha evento actual",fechaEventoActual);
      console.log("fecha nueva evento",fechaNuevaModi);
      if(fechaNuevaModi < fechaEventoActual){
        console.log("nononoo mal fecha");
        return res.status(404).json({success:false, error: "no peudes poner fecha mendor a la actual" });
      
      }else{

      }
    }else{

    }

    console.log("fecha inicio modi");
    console.log(eventoActualizado.horaInicio);
     console.log("fecha fein modi");
    console.log(eventoActualizado.horaFin);

      if (eventoActualizado.horaFin <= eventoActualizado.horaInicio  ) {
      console.log("siis menor o igual, mal mal mal");
      return res.status(404).json({success:false, error: "hora fin menor que hora Inicio" });
    }

    console.log("patata");
    
    const actuEventos= await eventos.updateOne(
      {code_Evento: eventoActualizado.code_evento },
      {
        $set: {
          nombreEvento: eventoActualizado.nombreEvento,
          descripcionEvento: eventoActualizado.descripcionEvento,
          fecha: eventoActualizado.fechaDate,
          horaInicio: eventoActualizado.horaInicio,
          horaFin: eventoActualizado.horaFin
        }
      }
    )
    
    console.log(actuEventos);
    

    //actualizar reservas de ese evento, usar el many ya que puede a ver varias de un evento

    const actuReservas = await reservas.updateMany(
      { codigo_evento: eventoActualizado.code_evento },
      {
        $set: {
          nombre_evento: eventoActualizado.nombreEvento,
          fecha: new Date(eventoActualizado.fechaDate).toISOString().split('T')[0],
          horaInicio: eventoActualizado.horaInicio,
          horaFin: eventoActualizado.horaFin
        }
      }
    );
    console.log("reservas modi");
    
    console.log(actuReservas);
    
    //acuerdate de la fechas
    
    
    
    res.json({ 
      success:true,
      mensaje: "evento actualizado correctamente y sus reservas",
      
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// crear reservas  

app.post("/api/crearreserva", async (req, res) => {
  try {
    const { reservas, eventos } = await connectToMongoDB();
    const { reserva_nueva } = req.body;

    console.log("Datos reserva:", reserva_nueva);
    
    // Verificar que el evento existe
    const existeEvento = await eventos.findOne({
      code_Evento: reserva_nueva.codigo_evento
    });

    if (!existeEvento) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    
    // Verificar plazas
    if (existeEvento.PlazasDisponibles <= 0) {
      return res.status(400).json({
        success:false,
        error: "No hay plazas disponibles para este evento"
      });
    }

    // no poder unirse a un evento con menos de 15 minutos
    const fecha_hora_actual = new Date();

    // juntar la fecha

    const fecha_evento_hora = new Date(`${existeEvento.fecha.split('T')[0]}T${existeEvento.horaInicio}:00`);


    const fecha_evento = new Date(fecha_evento_hora);

    console.log("fecha_evento:", fecha_evento);
    
    
    const minutos_15 = (fecha_evento - fecha_hora_actual) / (1000 * 60);

    console.log("diferencia minutos ", minutos_15.toFixed(0));

    if (minutos_15 <= 15) {
      return res.status(400).json({
        error: "No puedes reservar un evento con menos de 15 minutos de antelación"
      });
    }

    // Verificar que no se apunte al MISMO evento otra vez, comparar el dode_usuario y el codigo_evento
    const reservaMismoEvento = await reservas.findOne({
      code_usuario: reserva_nueva.code_usuario,
      codigo_evento: reserva_nueva.codigo_evento
    });

    if (reservaMismoEvento) {
      return res.status(400).json({
        error: "Ya estás apuntado a este evento"
      });
    }

    //next, revisar que no se solapen reservas
    const reservasDelUsuario = await reservas.find({  
      code_usuario: reserva_nueva.code_usuario
    }).toArray();
    

    // DATOS DEL EVENTO NUEVO (el que quiere reservar)
    
    const fechaNueva = reserva_nueva.fecha.split('T')[0]; // "2026-02-19"
    // pasar las horas a numeros por ejemplo 14:00 a 1400
    const inicioNuevo = parseInt(reserva_nueva.horaInicio.replace(':', '')); // "12:00" → 1200
    const finNuevo = parseInt(reserva_nueva.horaFin.replace(':', '')); // "14:00" → 1400
    
    console.log("NUEVA RESERVA - Fecha:", fechaNueva, "De:", inicioNuevo, "a", finNuevo);

    // Revisar cada reserva que YA TIENE el usuario
    for (let i = 0; i < reservasDelUsuario.length; i++) {
      const reservaExistente = reservasDelUsuario[i];
      
      // Buscar los datos del evento de ESA reserva (la que ya tiene)
      const eventoExistente = await eventos.findOne({
        code_Evento: reservaExistente.codigo_evento
      });

      if (eventoExistente) {
        // DATOS DEL EVENTO EXISTENTE
        const fechaExistente = eventoExistente.fecha.split('T')[0];
        const inicioExistente = parseInt(eventoExistente.horaInicio.replace(':', ''));
        const finExistente = parseInt(eventoExistente.horaFin.replace(':', ''));
        
        console.log("RESERVA EXISTENTE - Fecha:", fechaExistente, "De:", inicioExistente, "a", finExistente);
        
        if (fechaNueva === fechaExistente) {
          // Misma fecha, ahora comprobamos horas
          if (inicioNuevo < finExistente && finNuevo > inicioExistente && reservaExistente.estado === "activa") {
            
            return res.status(400).json({
              error: "Tienes una reserva en esa fecha, cancela o elige otro",
              detalles: {
                eventoQueTienes: eventoExistente.nombreEvento,
                horarioQueTienes: `${eventoExistente.horaInicio} - ${eventoExistente.horaFin}`,
                eventoQueQuieres: existeEvento.nombreEvento,
                horarioQueQuieres: `${existeEvento.horaInicio} - ${existeEvento.horaFin}`
              }
            });
          } else {
            console.log("mismo dia pero no horas");
          }
        } else {
          console.log("Días diferentes, no hay problema");
        }
      }
    }

    let code_reserva = 'Codigo' + Math.floor(Math.random() * 1000);
    
    // crear la reserva
    const reserva_new = {
      code_usuario: reserva_nueva.code_usuario,
      codigo_evento: reserva_nueva.codigo_evento,
      fecha: reserva_nueva.fecha,
      horaInicio: reserva_nueva.horaInicio,
      horaFin: reserva_nueva.horaFin,
      estado:"activa",
      code_reserva: code_reserva,
      nombre_evento:reserva_nueva.nombre_evento
    };
    console.log("patatas");
    
    console.log("nueva resr4ba:", reserva_new);
    


    await reservas.insertOne(reserva_new);
    


    await eventos.updateOne(
      { code_Evento: reserva_nueva.codigo_evento },
      { $inc: { PlazasDisponibles: -1 } }
    );

    res.status(201).json({
      mensaje: "Reserva creada con éxito",
      evento: existeEvento.nombreEvento,
      fecha: fechaNueva,
      hora: `${existeEvento.horaInicio} - ${existeEvento.horaFin}`
    });
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});




// mostrar las reservas de un usuario

//http://localhost:3000/api/reservas/usuario/Codigo134

app.get("/api/reservas/usuario/:code_usuario", async (req, res) => {
  
  try {
    const { reservas } = await connectToMongoDB();
    const { code_usuario } = req.params;
    
    console.log("Buscando reservas del usuario:", code_usuario);
    
    // Buscar todas las reservas de ese usuario
    const reservasDelUsuario = await reservas.find({
      code_usuario: code_usuario
    }).toArray();
    
    console.log(`Encontradas: ${reservasDelUsuario.length} reservas`);
    
    // Devolver las reservas
    res.status(200).json({
      success: true,
      usuario: code_usuario,
      total: reservasDelUsuario.length,
      reservas: reservasDelUsuario
    });
    
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});



// ver las reservas de ese evento
app.get("/api/reservas/eventos/:code_evento", async (req, res) => {
  
  try {
    const { reservas } = await connectToMongoDB();
    const { code_evento } = req.params;
    
    console.log("Buscando reservas del evento:", code_evento);
    
    // Buscar todas las reservas de ese usuario
    const reservasDelEvento = await reservas.find({
      codigo_evento: code_evento
    }).toArray();
    
    console.log(`Encontradas: ${reservasDelEvento.length} reservas`);
    
    // Devolver las reservas
    res.status(200).json({
      success: true,
      evento: code_evento,
      total: reservasDelEvento.length,
      reservas: reservasDelEvento
    });
    
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});












//http://localhost:3000/api/cancelarreserva/usuario/Codigo134

app.put("/api/cancelarreserva/usuario/:code_reserva", async (req, res) => {
  console.log("cancelar resrva");
  
  try {

    const { reservas } = await connectToMongoDB();
    const { eventos } = await connectToMongoDB();
    const { code_reserva } = req.params;
    
    console.log("CODIGO CODIGO", code_reserva);
    
    // Buscar la reserva  
    const reserva = await reservas.findOne({
      code_reserva: code_reserva
    });
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        error: "Reserva no encontrada"
      });
    }
    
    console.log(`Encontrada: ${reserva.code_reserva}`);
    //dia actual y fecha

    const fecha_hora_actual = new Date();

    // juntar la fecha
    const fecha_reserva = `${reserva.fecha}T${reserva.horaInicio}:00`;
    
    const fechaReserva = new Date(fecha_reserva);

    console.log(fecha_hora_actual);
    console.log(fecha_reserva);
    
    // restar la diferencia en minutos de las fechas para comparar
    const minutos_15 = (fechaReserva - fecha_hora_actual) / (1000 * 60);

    console.log("diferencia minutos ", minutos_15.toFixed(0));
    

    if (minutos_15 > 15) {
        console.log("la reserva cambiara a cancelada y ajuste plazas");
        //cambiar estado
        await reservas.updateOne(
          { code_reserva: code_reserva },
          { $set: { estado: "cancelada" } }
        );

        await eventos.updateOne(
          { code_Evento: reserva.codigo_evento},
          { $inc: { PlazasDisponibles: 1 } }
        );

    }else if(minutos_15 <= 15 && minutos_15 > 0){
      console.log("no asistido");
      await reservas.updateOne(
          { code_reserva: code_reserva },
          { $set: { estado: "no asistido" } }
        );
    }else {
      console.log("invente gpt invente");
    }

    // las fechas hace el cualculo bien  pero a la hora de visualizar las muestra en formato UTC por lo que se ve que es 1 hora menos de la que pone en tu relojito
    
    // Devolver las reservas
    res.status(200).json({
      success: true,
      message: "Reserva cancelada correctamente",
      reserva: reserva,
      hora_cancelacion: fecha_hora_actual,
      fechaReserva_reserva: fechaReserva,
      minutos_para_cancelar: minutos_15.toFixed(0)
    });
    
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});






app.put("/api/modiestadoreserva", async (req, res) => {
  const {reservas} = await connectToMongoDB();

  try {
    //acuerdate de la fechas


    const reserva_modi = req.body;
    console.log("eventos datos a actualizar", reserva_modi);
    //const { code_Evento, plazasTotales, ...otrosDatos } = eventoActualizado;
    console.log("llega reserva modi",reserva_modi);
    
    //separar codigo del resto de datos
    const {code_reserva, ...estadoNuevo}= reserva_modi;

    // encontrar evento
    console.log("datos reserva todo",reserva_modi);
    console.log("datos esatdo",estadoNuevo);


    const reservaExiste = await reservas.findOne({ code_reserva: code_reserva });

    if(!reservaExiste){
       return res.status(404).json({success:false, error: "Reserva no encontrado" });
    }


     const actuReservas = await reservas.updateMany(
       { code_reserva: code_reserva },
       {
         $set: {
           estado: estadoNuevo.estado,
        
         }
       }
     );
     console.log("reservas modi");  
     console.log(actuReservas); 
  
    
    
    
    res.json({ 
      success:true,
      mensaje: "evento actualizado correctamente y sus reservas",
      
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = app;
