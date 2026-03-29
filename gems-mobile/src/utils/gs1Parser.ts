/**
 * GS1 Data Matrix Parser
 * 
 * Parses GS1 formatted data from Data Matrix barcodes.
 * 
 * GS1 Data Matrix uses Application Identifiers (AIs) to encode different data elements.
 * Format: (AI)data(AI)data...
 * 
 * Common AIs:
 * - 01: GTIN (Global Trade Item Number) - 14 digits
 * - 10: Batch/Lot Number - variable length
 * - 17: Expiration Date (YYMMDD)
 * - 21: Serial Number - variable length
 * - 30: Count of items - variable length
 * - 37: Number of units contained - variable length
 * - 310n: Net weight (kg) - 6 digits
 * - 320n: Net weight (lb) - 6 digits
 * - 91-99: Company internal information
 * 
 * Group Separator (GS): ASCII 29 or \x1D, often represented as <GS> or FNC1
 */

export interface GS1Data {
  raw: string;
  gtin?: string;           // AI 01
  batchNumber?: string;    // AI 10
  serialNumber?: string;   // AI 21
  expirationDate?: string; // AI 17
  count?: string;          // AI 30
  quantity?: string;       // AI 37
  weight?: string;         // AI 310n or 320n
  customData?: Record<string, string>; // AI 91-99
  parsed: Record<string, string>;
}

// GS1 Application Identifiers with their formats
const AI_DEFINITIONS: Record<string, { name: string; length?: number; variable?: boolean }> = {
  '00': { name: 'SSCC', length: 18 },
  '01': { name: 'GTIN', length: 14 },
  '02': { name: 'GTIN of Contained Items', length: 14 },
  '10': { name: 'Batch/Lot Number', variable: true },
  '11': { name: 'Production Date', length: 6 },
  '12': { name: 'Due Date', length: 6 },
  '13': { name: 'Packaging Date', length: 6 },
  '15': { name: 'Best Before Date', length: 6 },
  '17': { name: 'Expiration Date', length: 6 },
  '20': { name: 'Product Variant', length: 2 },
  '21': { name: 'Serial Number', variable: true },
  '22': { name: 'Secondary Data Fields', variable: true },
  '30': { name: 'Count of Items', variable: true },
  '37': { name: 'Number of Units', variable: true },
  '310': { name: 'Net Weight (kg)', length: 6, variable: false },
  '3100': { name: 'Net Weight (kg)', length: 6, variable: false },
  '3101': { name: 'Net Weight (kg)', length: 6, variable: false },
  '3102': { name: 'Net Weight (kg)', length: 6, variable: false },
  '3103': { name: 'Net Weight (kg)', length: 6, variable: false },
  '3104': { name: 'Net Weight (kg)', length: 6, variable: false },
  '3105': { name: 'Net Weight (kg)', length: 6, variable: false },
  '320': { name: 'Net Weight (lb)', length: 6, variable: false },
  '3200': { name: 'Net Weight (lb)', length: 6, variable: false },
  '91': { name: 'Company Internal 1', variable: true },
  '92': { name: 'Company Internal 2', variable: true },
  '93': { name: 'Company Internal 3', variable: true },
  '94': { name: 'Company Internal 4', variable: true },
  '95': { name: 'Company Internal 5', variable: true },
  '96': { name: 'Company Internal 6', variable: true },
  '97': { name: 'Company Internal 7', variable: true },
  '98': { name: 'Company Internal 8', variable: true },
  '99': { name: 'Company Internal 9', variable: true },
};

/**
 * Parse GS1 Data Matrix raw string
 */
export function parseGS1DataMatrix(rawData: string): GS1Data {
  const result: GS1Data = {
    raw: rawData,
    parsed: {},
  };

  // Replace common GS character representations
  let data = rawData
    .replace(/<GS>/g, '\x1D')
    .replace(/\[FNC1\]/g, '\x1D')
    .replace(/\u001D/g, '\x1D'); // Normalize GS character

  // Remove leading ] character if present (symbology identifier)
  if (data.startsWith(']')) {
    data = data.substring(data.indexOf('01') !== -1 ? data.indexOf('01') : 1);
  }

  let position = 0;

  while (position < data.length) {
    // Find the AI
    let ai = '';
    let aiDef = null;

    // Try to match AIs (2-4 digits)
    for (let len = 4; len >= 2; len--) {
      const potentialAI = data.substring(position, position + len);
      if (AI_DEFINITIONS[potentialAI]) {
        ai = potentialAI;
        aiDef = AI_DEFINITIONS[potentialAI];
        break;
      }
    }

    if (!ai || !aiDef) {
      // Skip unknown character
      position++;
      continue;
    }

    position += ai.length;

    // Extract data for this AI
    let value = '';
    if (aiDef.variable) {
      // Variable length - read until GS or end of string
      const gsIndex = data.indexOf('\x1D', position);
      if (gsIndex !== -1) {
        value = data.substring(position, gsIndex);
        position = gsIndex + 1; // Skip GS
      } else {
        value = data.substring(position);
        position = data.length;
      }
    } else {
      // Fixed length
      const length = aiDef.length || 0;
      value = data.substring(position, position + length);
      position += length;
    }

    // Store parsed data
    result.parsed[ai] = value;

    // Map to specific fields
    switch (ai) {
      case '01':
        result.gtin = value;
        break;
      case '10':
        result.batchNumber = value;
        break;
      case '21':
        result.serialNumber = value;
        break;
      case '17':
        result.expirationDate = formatGS1Date(value);
        break;
      case '30':
        result.count = value;
        break;
      case '37':
        result.quantity = value;
        break;
      default:
        if (ai.startsWith('310') || ai.startsWith('320')) {
          result.weight = value;
        } else if (ai >= '91' && ai <= '99') {
          if (!result.customData) {
            result.customData = {};
          }
          result.customData[ai] = value;
        }
    }
  }

  return result;
}

/**
 * Format GS1 date (YYMMDD) to readable format
 */
function formatGS1Date(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;

  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);

  // Determine century (assume 2000-2099 for 00-99)
  const year = yy < 50 ? 2000 + yy : 1900 + yy;

  return `${year}-${mm}-${dd}`;
}

/**
 * Format parsed GS1 data for display
 */
export function formatGS1DataForDisplay(gs1Data: GS1Data): string {
  const parts: string[] = [];

  if (gs1Data.gtin) {
    parts.push(`GTIN: ${gs1Data.gtin}`);
  }
  if (gs1Data.batchNumber) {
    parts.push(`Batch: ${gs1Data.batchNumber}`);
  }
  if (gs1Data.serialNumber) {
    parts.push(`Serial: ${gs1Data.serialNumber}`);
  }
  if (gs1Data.expirationDate) {
    parts.push(`Exp: ${gs1Data.expirationDate}`);
  }
  if (gs1Data.count) {
    parts.push(`Count: ${gs1Data.count}`);
  }
  if (gs1Data.quantity) {
    parts.push(`Qty: ${gs1Data.quantity}`);
  }
  if (gs1Data.weight) {
    parts.push(`Weight: ${gs1Data.weight}`);
  }

  return parts.length > 0 ? parts.join(' | ') : gs1Data.raw;
}

/**
 * Validate if a string looks like GS1 data
 */
export function isLikelyGS1Data(data: string): boolean {
  // Check for common GS1 AIs at the start
  const commonAIs = ['01', '00', '10', '21'];
  return commonAIs.some(ai => {
    const normalized = data.replace(']', '').replace(/<GS>/g, '').replace(/\[FNC1\]/g, '');
    return normalized.startsWith(ai) || normalized.includes(`(${ai})`);
  });
}

/**
 * Create a unique identifier from GS1 data
 * Priority: Serial Number > Batch Number + GTIN > GTIN > Raw
 */
export function createGS1Identifier(gs1Data: GS1Data): string {
  if (gs1Data.serialNumber) {
    return gs1Data.serialNumber;
  }
  if (gs1Data.batchNumber && gs1Data.gtin) {
    return `${gs1Data.gtin}-${gs1Data.batchNumber}`;
  }
  if (gs1Data.gtin) {
    return gs1Data.gtin;
  }
  return gs1Data.raw;
}
