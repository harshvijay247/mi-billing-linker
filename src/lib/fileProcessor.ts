import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface ProcessingResult {
  success: boolean;
  headers: string[];
  data: (string | number | null)[][];
  matchedCount: number;
  unmatchedCount: number;
  error?: string;
}

export interface BillingData {
  serialNo: string;
  lastColumnValue: string | number | null;
  lastColumnHeader: string;
}

/**
 * Parse Excel file and return worksheet data
 */
const parseExcelFile = async (file: File | ArrayBuffer): Promise<XLSX.WorkBook> => {
  let data: ArrayBuffer;
  
  if (file instanceof File) {
    data = await file.arrayBuffer();
  } else {
    data = file;
  }
  
  return XLSX.read(data, { type: 'array' });
};

/**
 * Extract billing data from split files in ZIP
 * Collects serial numbers and their corresponding last column values
 */
const extractBillingData = async (zipFile: File): Promise<Map<string, BillingData>> => {
  const zip = await JSZip.loadAsync(zipFile);
  const billingMap = new Map<string, BillingData>();
  
  const files = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir && (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv'))
  );
  
  for (const fileName of files) {
    const fileData = await zip.files[fileName].async('arraybuffer');
    const workbook = XLSX.read(fileData, { type: 'array' });
    
    // Process first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown as (string | number | null)[][];
    
    if (jsonData.length < 2) continue;
    
    const headers = jsonData[0] as string[];
    const lastColumnIndex = headers.length - 1;
    const lastColumnHeader = headers[lastColumnIndex] || `Column_${lastColumnIndex + 1}`;
    
    // Find "New Serial No." column (usually first column or specifically named)
    // Looking for column that might contain serial numbers
    let serialColumnIndex = 0; // Default to first column
    
    // Try to find a column with "serial" in the name
    headers.forEach((header, index) => {
      if (header && typeof header === 'string' && 
          (header.toLowerCase().includes('serial') || header.toLowerCase().includes('new serial'))) {
        serialColumnIndex = index;
      }
    });
    
    // Process each row (skip header)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const serialNo = String(row[serialColumnIndex] || '').trim();
      const lastColumnValue = row[lastColumnIndex];
      
      if (serialNo) {
        billingMap.set(serialNo, {
          serialNo,
          lastColumnValue,
          lastColumnHeader,
        });
      }
    }
  }
  
  return billingMap;
};

/**
 * Main processing function
 * Matches MI file's New Serial No. (column F) with billing data
 */
export const processFiles = async (
  miFile: File,
  billingZipFile: File
): Promise<ProcessingResult> => {
  try {
    // Step 1: Extract billing data from ZIP
    const billingData = await extractBillingData(billingZipFile);
    
    if (billingData.size === 0) {
      return {
        success: false,
        headers: [],
        data: [],
        matchedCount: 0,
        unmatchedCount: 0,
        error: 'No valid data found in billing ZIP file',
      };
    }
    
    // Step 2: Parse MI file
    const miWorkbook = await parseExcelFile(miFile);
    const sheetName = miWorkbook.SheetNames[0];
    const worksheet = miWorkbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown as (string | number | null)[][];
    
    if (jsonData.length < 2) {
      return {
        success: false,
        headers: [],
        data: [],
        matchedCount: 0,
        unmatchedCount: 0,
        error: 'MI file appears to be empty or has no data rows',
      };
    }
    
    // Get headers and add new column for billing data
    const headers = [...(jsonData[0] as string[])];
    
    // Get the header name from billing data
    const firstBillingEntry = billingData.values().next().value;
    const newColumnHeader = firstBillingEntry?.lastColumnHeader || 'Billing_Data';
    headers.push(newColumnHeader);
    
    // Column F is index 5 (0-based) - "New Serial No."
    const serialColumnIndex = 5;
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    // Process each data row
    const processedData: (string | number | null)[][] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = [...(jsonData[i] || [])];
      
      // Ensure row has enough columns
      while (row.length < headers.length - 1) {
        row.push(null);
      }
      
      const serialNo = String(row[serialColumnIndex] || '').trim();
      const billingEntry = billingData.get(serialNo);
      
      if (billingEntry) {
        row.push(billingEntry.lastColumnValue);
        matchedCount++;
      } else {
        row.push(null);
        unmatchedCount++;
      }
      
      processedData.push(row);
    }
    
    return {
      success: true,
      headers,
      data: processedData,
      matchedCount,
      unmatchedCount,
    };
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      headers: [],
      data: [],
      matchedCount: 0,
      unmatchedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Generate downloadable Excel file from processed data
 */
export const generateExcelDownload = (headers: string[], data: (string | number | null)[][]) => {
  const worksheetData = [headers, ...data];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Processed_MI');
  
  // Generate and download
  XLSX.writeFile(workbook, 'MI_Processed_Result.xlsx');
};
