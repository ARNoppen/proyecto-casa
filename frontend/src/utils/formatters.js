/**
 * Formatea un número o string numérico al formato de moneda argentino.
 * Ejemplo: 1038414.50 -> 1.038.414,50
 *
 * @param {Number|String} value - El valor a formatear
 * @returns {String} El valor formateado
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0,00';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Usamos Intl.NumberFormat para tener el formato local 'es-AR'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Normaliza un valor monetario a un número con máximo 2 decimales.
 * Útil para inputs y cálculos antes de enviar al backend.
 * 
 * @param {Number|String} value 
 * @returns {Number}
 */
export const normalizeMoney = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};
