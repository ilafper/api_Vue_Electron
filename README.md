## Implementación de ZOD

Para este proyecto se implementó **Zod**, una librería de validación de datos para el backend, específicamente en la parte de registro de usuario.

---

## ¿Por qué usarlo?

| Motivo | Explicación |
|--------|-------------|
| **Seguridad** | Los datos del frontend pueden ser manipulados. Zod valida en el backend que la información sea correcta antes de procesarla. |
| **Mensajes claros** | Permite personalizar mensajes de error para cada campo, mejorando la experiencia del usuario. |
| **Código limpio** | Evita tener decenas de `if` anidados para validar campos. Todo se define en un esquema legible. |

---

## Características principales

- **Validación de tipos** (strings, emails, longitudes mínimas)
- **Reglas personalizadas** con `refine` (ej: contraseñas coincidentes)
- **Mensajes de error personalizados** en español
- **Validación en el backend** (capa extra de seguridad)
- **Integración simple** con Express
- **Uso de `safeParse`** para evitar try/catch innecesarios

---

## Instalación

```bash
npm install zod
```
## Importar la libreria


```bash
const { z } = require('zod');
```


Una vez que ya importamos la libreria podemos ponernos manos a la obra y poder usarlo , para ello nos vamos a nuestro endpoint de creacion de usuario.

![parte zod](imagenes/zod.png)

Añadimos esta parte despues de que se reciban los datos y creamos un "esquema" en donde estructuramos losdatos y le decimos el tipo de datios que debe ser o que se espera y tambvien como podemos ver algunos tiene un .min() que le indicamos el numero de caracteres o espacios minimos que debe tener y un mensaje que saltara el primero que incumpla esas condiciones.



## Prueba.
En nuestro registro del proyecto añadimos un nombre de menos de 3 caracteres para probar
![prueba registro](imagenes/registro.png)


Resultado de la prueba.
![prueba2 registro](imagenes/errorlogin.png)


## Conclusion

La validación con Zod me ha parecido interesante porque normalmente lo que hacía era validarlo a mano con condicionales. Al principio tenía dudas, ya que en mi HTML ya especificaba el tipo de datos que debía llegar (con required, type="email", etc.), por lo que todo llegaba "bien" al backend. Sin embargo, he aprendido que siempre es mejor hacer las validaciones en el backend, porque las validaciones del HTML se pueden cambiar fácilmente o incluso saltarse, dejando la aplicación expuesta a datos incorrectos o maliciosos. Zod me ha permitido centralizar estas validaciones de forma limpia y profesional.



