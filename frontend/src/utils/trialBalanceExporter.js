import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Function to export the trial balance to PDF
export const exportToPDF = (filteredTrialBalance, totalDebits, totalCredits, dateRange = {}) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm'
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Trial Balance', 105, 15, { align: 'center' });

        // Add date range if specified
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const dateText = dateRange.startDate || dateRange.endDate 
            ? `Period: ${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`
            : 'All Transactions';
        doc.text(dateText, 105, 22, { align: 'center' });

        // Prepare data for the table
        const headers = [["Account Name", "Account Type", "Debit", "Credit"]];
        const data = filteredTrialBalance.map(entry => [
            entry.accountName,
            entry.accountType,
            entry.debit > 0 ? entry.debit.toFixed(2) : '-',
            entry.credit > 0 ? entry.credit.toFixed(2) : '-'
        ]);

        // Add totals row
        data.push(['TOTAL', '', totalDebits.toFixed(2), totalCredits.toFixed(2)]);

        // Generate the table
        autoTable(doc, {
            head: headers,
            body: data,
            startY: 30,
            margin: { left: 10, right: 10 },
            headStyles: {
                fillColor: [241, 245, 249],
                textColor: [30, 41, 59],
                fontStyle: 'bold'
            },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            styles: {
                fontSize: 10,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            didDrawPage: (data) => {
                // Footer
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Generated on ${new Date().toLocaleDateString()}`,
                    data.settings.margin.left,
                    doc.internal.pageSize.height - 10
                );
            }
        });

        // Save the PDF
        doc.save('trial_balance.pdf');
    } catch (error) {
        console.error('PDF export error:', error);
        throw new Error('Failed to generate PDF');
    }
};

// Rest of your export functions (exportToExcel, exportToDOC) remain the same
export const exportToExcel = (filteredTrialBalance, totalDebits, totalCredits) => {
    const header = ["Account Name", "Account Type", "Debit", "Credit"];
    const data = filteredTrialBalance.map(entry => [
        entry.accountName,
        entry.accountType,
        entry.debit > 0 ? entry.debit : '-',
        entry.credit > 0 ? entry.credit : '-'
    ]);
    
    // Add totals row
    data.push(['TOTAL', '', totalDebits, totalCredits]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, 'trial_balance.xlsx');
};

export const exportToDOC = (filteredTrialBalance, totalDebits, totalCredits, dateRange = {}) => {
    // Format date range text
    const dateText = dateRange.startDate || dateRange.endDate 
        ? `Period: ${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}`
        : 'All Transactions';

    const formatNumber = (num) => {
        return num.toFixed(2).replace(/,/g, ''); // Remove commas
    };

    const docContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Trial Balance</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; margin-bottom: 5px; }
                .date-range { color: #7f8c8d; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { background-color: #f8f9fa; text-align: left; font-weight: bold; }
                th, td { border: 1px solid #dee2e6; padding: 8px 12px; }
                .number { text-align: right; }
                .total-row td { font-weight: bold; background-color: #f8f9fa; }
                .footer { margin-top: 20px; color: #7f8c8d; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <h1>Trial Balance</h1>
            <div class="date-range">${dateText}</div>
            <table>
                <thead>
                    <tr>
                        <th>Account Name</th>
                        <th>Account Type</th>
                        <th class="number">Debit ($)</th>
                        <th class="number">Credit ($)</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredTrialBalance.map(entry => `
                        <tr>
                            <td>${entry.accountName.replace(/’/g, "'")}</td>
                            <td>${entry.accountType}</td>
                            <td class="number">${entry.debit > 0 ? formatNumber(entry.debit) : '-'}</td>
                            <td class="number">${entry.credit > 0 ? formatNumber(entry.credit) : '-'}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="2"><strong>TOTAL</strong></td>
                        <td class="number"><strong>${formatNumber(totalDebits)}</strong></td>
                        <td class="number"><strong>${formatNumber(totalCredits)}</strong></td>
                    </tr>
                </tbody>
            </table>
            <div class="footer">
                Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([docContent], { type: 'application/msword;charset=UTF-8' });
    saveAs(blob, 'trial_balance.doc');
};

// Helper function to escape HTML special characters
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper function to format currency
function formatCurrency(amount) {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}