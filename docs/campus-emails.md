# Correos automáticos del Campus

La automatización queda programada diariamente a las 08:00 UTC. Envía avisos de citas del día siguiente y los lunes también envía los recordatorios semanales de cursos. En horario peninsular español será aproximadamente a las 09:00 en invierno y 10:00 en verano.

Antes de activarla:

1. Ejecuta `sql_curso_notificaciones.sql` en la base de datos `test`.
2. En Vercel, configura `EMAIL_USER` y `EMAIL_PASS` con una cuenta Gmail remitente y su contraseña de aplicación. No compartas esos valores por chat.
3. Configura `CRON_SECRET` como una clave aleatoria larga.
4. Comprueba que `APP_URL` apunta al dominio correcto del campus.
5. Publica el cambio en producción para que Vercel registre el cron.

Los correos de bienvenida, citas, inscripción y finalización se encolan desde la web. El aviso de cita se envía el día anterior. El correo semanal enumera el contenido pendiente. El correo final incluye el certificado en el cuerpo del mensaje y un enlace al apartado Informes para imprimirlo o guardarlo como PDF. Los correos propios de Orienta llevan el logo y los datos profesionales de Antonio Cantillo Rueda (COPAO AO14923).

La tabla de notificaciones deduplica los envíos por inscripción, finalización y semana, y permite reintentar mensajes fallidos. El contenido y la dirección del destinatario se borran de esa tabla después de enviar el mensaje.
