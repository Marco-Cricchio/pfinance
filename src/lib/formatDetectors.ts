/**
 * Format detectors for different types of financial documents
 * Used to identify the format of a document and select the appropriate parser
 */

/**
 * Detects if text is from a BancoPosta statement (new format)
 * Checks for specific markers in the document that are unique to BancoPosta format
 */
export function isBancoPostaFormat(text: string): boolean {
  // Normalize text for consistent detection
  const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');
  
  // Check for mandatory markers that indicate BancoPosta format
  const requiredMarkers = [
    'SALDO E MOVIMENTI',
    'RIEPILOGO CONTO CORRENTE',
    'LISTA MOVIMENTI',
    'BANCOPOSTA' // Logo/header text
  ];
  
  // If at least 3 of these markers are present, we can confidently identify as BancoPosta
  let markerCount = 0;
  for (const marker of requiredMarkers) {
    if (normalizedText.includes(marker)) {
      markerCount++;
    }
  }
  
  return markerCount >= 3;
}

/**
 * Registry of format detectors
 * Add new detectors here to support additional formats
 */
export const formatDetectors = [
  {
    name: 'BancoPosta',
    detect: isBancoPostaFormat
  },
  // Add more detectors as needed
];

/**
 * Determines the format of a document based on its content
 * Returns the name of the first matching format or null if no match
 */
export function detectDocumentFormat(text: string): string | null {
  for (const detector of formatDetectors) {
    if (detector.detect(text)) {
      return detector.name;
    }
  }
  
  return null;
}