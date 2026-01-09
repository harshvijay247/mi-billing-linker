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
const parseExcelFile = async (data: ArrayBuffer): Promise<XLSX.WorkBook> => {
  return XLSX.read(data, { type: 'array' });
};

/**
 * Check if file is a valid Excel file based on extension
 */
const isValidExcelFile = (fileName: string): boolean => {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
};

/**
 * Check if file should be skipped (hidden files, system files, etc.)
 */
const shouldSkipFile = (fileName: string): boolean => {
  const name = fileName.split('/').pop() || '';
  return (
    name.startsWith('.') ||
    name.startsWith('~$') ||
    fileName.includes('__MACOSX') ||
    fileName.includes('.DS_Store')
  );
};

/**
 * Extract billing data from split files in ZIP
 * Collects serial numbers and their corresponding last column values
 */
const extractBillingData = async (zipFile: File): Promise<Map<string, BillingData>> => {
  const zip = await JSZip.loadAsync(zipFile);
  const billingMap = new Map<string, BillingData>();
  
  const files = Object.keys(zip.files).filter((name) => {
    const file = zip.files[name];
    return !file.dir && isValidExcelFile(name) && !shouldSkipFile(name);
  });

  console.log('Found valid files in ZIP:', files);

  for (const fileName of files) {
    try {
      const fileData = await zip.files[fileName].async('arraybuffer');
      
      // Skip very small files (likely empty or corrupt)
      if (fileData.byteLength < 100) {
        console.log(`Skipping ${fileName}: file too small`);
        continue;
      }

      const workbook = XLSX.read(fileData, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      // Process first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        console.log(`Skipping ${fileName}: no sheets found`);
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null,
        blankrows: false,
      }) as (string | number | null)[][];

      if (jsonData.length < 2) {
        console.log(`Skipping ${fileName}: insufficient data rows`);
        continue;
      }

      const headers = jsonData[0] as (string | null)[];
      const lastColumnIndex = headers.length - 1;
      const lastColumnHeader = String(headers[lastColumnIndex] || `Column_${lastColumnIndex + 1}`);

      // Find serial number column - looking for column containing "serial"
      let serialColumnIndex = 0;
      headers.forEach((header, index) => {
        if (header && typeof header === 'string' &&
            (header.toLowerCase().includes('serial') || 
             header.toLowerCase().includes('new serial') ||
             header.toLowerCase().includes('sr') ||
             header.toLowerCase().includes('meter'))) {
          serialColumnIndex = index;
        }
      });

      console.log(`Processing ${fileName}: serial column=${serialColumnIndex}, last column=${lastColumnIndex}`);

      // Process each row (skip header)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const rawSerial = row[serialColumnIndex];
        const serialNo = String(rawSerial ?? '').trim();
        const lastColumnValue = row[lastColumnIndex];

        if (serialNo && serialNo !== 'null' && serialNo !== 'undefined') {
          billingMap.set(serialNo, {
            serialNo,
            lastColumnValue,
            lastColumnHeader,
          });
        }
      }

      console.log(`Extracted ${billingMap.size} records from ${fileName}`);
    } catch (fileError) {
      console.warn(`Error processing ${fileName}:`, fileError);
      // Continue with other files
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
    console.log('Extracting billing data from ZIP...');
    const billingData = await extractBillingData(billingZipFile);

    if (billingData.size === 0) {
      return {
        success: false,
        headers: [],
        data: [],
        matchedCount: 0,
        unmatchedCount: 0,
        error: 'No valid data found in billing ZIP file. Make sure it contains .xlsx, .xls, or .csv files with data.',
      };
    }

    console.log(`Total billing records extracted: ${billingData.size}`);

    // Step 2: Parse MI file
    console.log('Parsing MI file...');
    const miArrayBuffer = await miFile.arrayBuffer();
    const miWorkbook = await parseExcelFile(miArrayBuffer);
    const sheetName = miWorkbook.SheetNames[0];
    const worksheet = miWorkbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null,
      blankrows: false,
    }) as (string | number | null)[][];

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

      const rawSerial = row[serialColumnIndex];
      const serialNo = String(rawSerial ?? '').trim();
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

    console.log(`Processing complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);

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
