// Testimonios de la landing, cargados por la dueña de Weda (2026-10-29), que responde por su autenticidad y por el permiso de cada pareja.
// Para agregar o quitar uno, editar esta lista. No se inventan nombres, fotos ni frases (Ley 24.240; auditoría 2026-10-28, F-10).
// Con la lista vacía la landing vuelve a mostrar «Por qué Weda».
export type Testimonial = {
  /** La frase, tal como la dijo la pareja (sin retocar el sentido). */
  quote: string;
  /** Cómo figuran, por ejemplo «Camila & Lucas». */
  who: string;
  /** Foto opcional en /public/parejas. */
  photo?: string;
};

export const testimonials: Testimonial[] = [
  { quote: 'Weda nos ayudó a tener todo mucho más ordenado. Pudimos ver quiénes nos habían hecho un regalo y llevar un registro para no olvidarnos de agradecerle a nadie.', who: 'Camila & Lucas', photo: '/parejas/camila-lucas.jpg' },
  { quote: 'Nos re sirvió tener todo en la página. Más de uno nos preguntó cómo llegar o a qué hora era cada cosa, y les pasábamos el link directamente. Tenían el mapa, los horarios y toda la info ahí, así que no tuvimos que estar respondiendo mil mensajes el día del casamiento.', who: 'Valentina & Mariano', photo: '/parejas/valentina-mariano.jpg' },
  { quote: 'Nos divertimos un montón armando la lista porque pudimos elegir regalos que tenían que ver con nosotros y con esta nueva etapa. Más allá del regalo en sí, nos gustaba pensar que cada persona estaba aportando a algo que queríamos hacer juntos.', who: 'Julieta & Franco', photo: '/parejas/julieta-franco.jpg' },
  { quote: 'Nos sirvió para organizarnos con los invitados. Cada uno podía confirmar desde la página y nosotros ir viendo las respuestas sin tener que revisar todos los chats.', who: 'Juan & Claudia', photo: '/parejas/juan-claudia.jpg' },
];
