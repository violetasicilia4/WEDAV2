import { PLANS, PRICE_UNIT } from '@/lib/weda/plans';

// Preguntas frecuentes de /lista-de-regalos: las usan la página (lo que se ve) y su `head` (datos estructurados FAQPage), con el mismo texto.
const giftPlan = PLANS.find(p => p.id === 'regalos');
const price = giftPlan ? `$ ${giftPlan.price.toLocaleString('es-AR')}` : '';


export const faqs = [
  { q: '¿Qué es una lista de regalos de casamiento online?', a: 'Es una página con los regalos que los novios eligieron, que se comparte con un link. Los invitados eligen uno y lo pagan desde el celular. En Weda cada regalo se paga por transferencia al alias de los novios.' },
  { q: '¿Cómo reciben el dinero los novios?', a: 'Por transferencia, directo a la cuenta cuyo alias cargaron en Weda. El invitado transfiere y sube el comprobante; los novios lo revisan y confirman el regalo.' },
  { q: '¿Weda se queda con un porcentaje de los regalos?', a: 'No. Weda no cobra ni mueve el dinero de los regalos: la transferencia va de la cuenta del invitado a la de los novios.' },
  { q: '¿Los invitados pueden pagar con tarjeta?', a: 'Todavía no. Por ahora los regalos se hacen por transferencia al alias de los novios.' },
  { q: '¿Qué regalos puedo poner en mi lista?', a: 'Podés elegir de los sets de Weda (Luna de miel, Hogar, Experiencias, Proyectos futuros, Para el primer hogar y Escapada de a dos) o crear tus propios regalos con el nombre y el monto que quieras.' },
  { q: '¿Cómo sé quién me hizo un regalo?', a: 'En tu panel ves cada regalo recibido con el nombre de quien lo hizo, su mensaje y el comprobante de la transferencia. Así tenés el registro para agradecer.' },
  { q: '¿Cómo encuentran mi lista los invitados?', a: 'Con el link que les compartís. También pueden buscarla en Weda por el nombre de los novios.' },
  { q: '¿Cuánto cuesta la lista de regalos?', a: `Armarla es gratis: pagás recién al publicarla.${giftPlan ? ` El plan ${giftPlan.name} cuesta ${price}, ${PRICE_UNIT}.` : ''} Si además querés el sitio del casamiento y la confirmación de asistencia, están en los planes Celebración.` },
  { q: '¿Puedo tener la lista de regalos y el sitio del casamiento juntos?', a: 'Sí. Con los planes Celebración la lista de regalos vive en el mismo sitio que la fecha, los lugares y la confirmación de asistencia.' },
];
