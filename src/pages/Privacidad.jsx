// src/pages/Privacidad.jsx
import { useEffect } from 'react';

export default function Privacidad() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <article className="mx-auto max-w-3xl space-y-5 rounded-xl bg-white p-6 text-sm leading-relaxed text-stone-700 shadow-sm sm:p-10">
      <h1 className="font-serif text-2xl font-bold text-tierra-800">Política de privacidad</h1>
      <p>Última actualización: 11 Noviembre de 2026</p>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">1. Responsable del tratamiento</h2>
      <p>
        Antonio Cantillo Rueda, psicólogo colegiado (COPAO nº AO14923).
        Contacto: info@orientapsicologia.es. Sitio web: www.orientapsicologia.es.
      </p>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">2. Datos que recogemos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Registro e inicio de sesión: nombre de usuario, correo electrónico y contraseña (cifrada).</li>
        <li>Reservas de consulta: fecha, hora, modalidad y el motivo de consulta si lo escribes.</li>
        <li>Chat, tareas e informes: el contenido que introduces en esas secciones.</li>
        <li>Formulario de opinión: las respuestas que envías voluntariamente.</li>
        <li>Datos técnicos necesarios para el funcionamiento del sitio.</li>
      </ul>
      <p>
        El motivo de consulta y otros datos sobre salud o situación personal son categoría especial
        (art. 9 RGPD) y solo se tratan con tu consentimiento explícito.
      </p>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">3. Finalidad y base legal</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Gestionar tu cuenta y tus citas: ejecución de la relación que solicitas (art. 6.1.b RGPD).</li>
        <li>Atender tus consultas: tu consentimiento (art. 6.1.a RGPD).</li>
        <li>Mejorar la web y recoger opiniones: tu consentimiento, que puedes retirar en cualquier momento.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">4. Destinatarios y encargados</h2>
      <p>
        No vendemos ni cedemos tus datos. Algunos proveedores tratan datos en nuestro nombre con las garantías
        del RGPD: alojamiento (Vercel), base de datos TiDB Cloud y Microsoft Forms para el formulario de opinión.
      </p>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">5. Conservación</h2>
      <p>
        Conservamos tus datos mientras mantengas tu cuenta o sea necesario para el servicio. Después se bloquean
        durante los plazos legales y se suprimen. Las historias clínicas se rigen por la normativa sanitaria aplicable.
      </p>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">6. Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiendo a info@orientapsicologia.es. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>

      <h2 className="pt-2 text-lg font-bold text-tierra-800">7. Seguridad y cookies</h2>
      <p>
        Usamos conexiones cifradas (HTTPS) y contraseñas cifradas. La web usa el almacenamiento de tu navegador
        para mantener la sesión y recordar el formulario de opinión. No usamos cookies publicitarias.
      </p>
    </article>
  );
}