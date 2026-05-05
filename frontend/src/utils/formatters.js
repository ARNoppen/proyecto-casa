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
