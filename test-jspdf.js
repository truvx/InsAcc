import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

console.log('jsPDF:', !!jsPDF);
console.log('autoTable:', !!autoTable);

try {
  const doc = new jsPDF('landscape');
  doc.addPage();
  autoTable(doc, {
    head: [['A']],
    body: [['B']]
  });
  console.log('success');
} catch (e) {
  console.error('error', e);
}
