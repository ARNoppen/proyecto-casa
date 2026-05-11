import * as XLSX from 'xlsx';

/**
 * Exporta una lista de gastos a Excel.
 * @param {Array} expenses - Lista de gastos a exportar.
 * @param {String} fileName - Nombre del archivo (ej: gastos_2026_05.xlsx).
 */
export const exportExpensesToExcel = (expenses, fileName) => {
  if (!expenses || expenses.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  // Preparamos los datos para el Excel (limpios de metadatos técnicos)
  const dataToExport = expenses.map(expense => ({
    'Fecha': expense.date.split(' ')[0].split('-').reverse().join('/'),
    'Concepto': expense.concept_name || '',
    'Descripción': expense.description || '',
    'Monto': parseFloat(expense.amount),
    'Cargado por': expense.created_by_name || '',
    'Responsable': expense.assigned_to_name || ''
  }));

  // Calcular Total
  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  // Agregar fila vacía y fila de TOTAL
  dataToExport.push({}); // Fila vacía
  dataToExport.push({
    'Fecha': '',
    'Concepto': '',
    'Descripción': 'TOTAL PERIODO:',
    'Monto': totalAmount,
    'Cargado por': '',
    'Responsable': ''
  });

  // Crear libro y hoja
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  // --- FORMATEO DE CELDAS ---
  // Aplicamos formato de moneda a la columna 'Monto' (Columna D -> índice 3)
  // Y a la celda del total
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = 1; R <= range.e.r; ++R) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: 3 }); // Columna 3 es 'Monto'
    if (!worksheet[cellAddress]) continue;
    
    // Formato de contabilidad/moneda (sin Rojo)
    worksheet[cellAddress].t = 'n';
    worksheet[cellAddress].z = '"$" #,##0.00;-"$" #,##0.00';
  }

  // Intentamos resaltar la etiqueta del total (ya que no podemos poner negrita técnica fácilmente)
  const totalLabelAddress = XLSX.utils.encode_cell({ r: range.e.r, c: 2 });
  if (worksheet[totalLabelAddress]) {
    worksheet[totalLabelAddress].v = '>> TOTAL PERIODO:';
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Gastos');

  // Ajustar anchos de columna (opcional pero recomendado para backup legible)
  const wscols = [
    { wch: 12 }, // Fecha
    { wch: 20 }, // Concepto
    { wch: 40 }, // Descripción
    { wch: 12 }, // Monto
    { wch: 20 }, // Cargado por
    { wch: 20 }  // Responsable
  ];
  worksheet['!cols'] = wscols;

  // Generar y descargar
  XLSX.writeFile(workbook, fileName);
};
