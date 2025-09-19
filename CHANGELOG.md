# Changelog

All notable changes to pFinance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-19

### 🔐 Added - Encrypted Backup System

**Major Feature**: Complete encrypted backup and restore functionality for database protection.

#### New Features
- **AES-256-GCM Encryption**: Military-grade encryption for sensitive financial data
- **Custom Password Protection**: User-defined passwords for each backup
- **Complete Data Export**: Includes transactions, categories, rules, balances, and audit logs
- **Secure File Format**: New `.enc` file format with structured metadata and integrity checking
- **Enhanced UI**: Updated backup/restore interfaces with encryption options and validation

#### Security Improvements
- **PBKDF2 Key Derivation**: 100,000 iterations for resistance against brute-force attacks
- **Unique Salt Generation**: Each backup uses a cryptographically secure salt
- **SHA-256 Integrity Checking**: Data integrity verification on restore
- **Memory Security**: Secure password and key wiping from memory
- **Constant-Time Comparison**: Protection against timing attacks
- **Input Validation**: Comprehensive validation for security and DoS prevention

#### API Endpoints
- `POST /api/database/encrypted-backup`: Create encrypted backups
- `POST /api/database/encrypted-restore`: Restore from encrypted backups
- Full compatibility with existing `/api/database/backup` and `/api/database/restore` endpoints

#### UI/UX Enhancements
- **Encryption Toggle**: Easy switch between encrypted and plain backups
- **Password Validation**: Real-time password strength and confirmation checking
- **Visual Indicators**: Clear icons and badges for encrypted vs plain backups
- **Enhanced Options**: Include/exclude balance history and audit logs
- **Error Handling**: Detailed error messages for encryption/decryption failures

#### Technical Improvements
- **Backward Compatibility**: Existing `.json` backups continue to work seamlessly
- **Format Detection**: Automatic detection of file types (.json vs .enc)
- **Enhanced Crypto Library**: Extended with security hardening and validation
- **Rate Limiting**: Protection against large file attacks (100MB max)
- **Comprehensive Testing**: Unit tests for encryption, API endpoints, and compatibility

### 📚 Documentation
- **Complete Documentation**: Added `docs/ENCRYPTED_BACKUPS.md` with comprehensive guide
- **API Documentation**: Detailed endpoint specifications and response formats
- **Security Best Practices**: Guidelines for password management and backup storage
- **Troubleshooting Guide**: Common issues and solutions
- **Updated README**: Enhanced with encrypted backup feature information

### 🧪 Testing
- **Unit Tests**: Encryption/decryption round-trip validation
- **Compatibility Tests**: Legacy backup format support verification
- **API Tests**: Comprehensive endpoint testing with various scenarios
- **Security Tests**: Password validation and error handling tests

### 💻 Developer Experience
- **Type Safety**: Complete TypeScript interfaces for all new features
- **Error Handling**: Comprehensive error catching and user-friendly messages
- **Code Organization**: Clean separation of concerns between crypto, API, and UI layers
- **Testing Utilities**: Helper scripts for compatibility and format validation

### 🔄 Migration Notes
- **No Breaking Changes**: All existing functionality remains unchanged
- **Automatic Feature**: Encrypted backups are available immediately after update
- **Default Behavior**: Encryption is enabled by default for new backups (recommended)
- **Legacy Support**: Old backups continue to work without modification

### 📋 Requirements
- Node.js 18+ (unchanged)
- Existing database schema automatically extended
- No additional dependencies required

---

## [1.x.x] - Previous Versions

### Legacy Features
- Multi-format PDF parsing (BancoPosta, legacy formats)
- AI-powered transaction categorization
- Interactive financial dashboard
- SQLite database management
- AI financial advisor chat
- Excel/CSV import support
- Smart duplicate detection

---

**Note**: Version 2.0.0 represents a major milestone in data security for pFinance users. The encrypted backup system ensures that your sensitive financial data remains protected both at rest and during transfer, while maintaining full compatibility with existing workflows.

## [2.0.1] - 2025-01-19

### 🎛️ Added - Category Toggle Feature

**New Feature**: Toggle "Seleziona/Deseleziona Tutte" per le categorie nei filtri avanzati.

#### UI/UX Enhancements
- **Toggle Switch**: Nuovo switch nei moduli "Filtri Avanzati" per selezionare/deselezionare tutte le categorie
- **Visual Indicators**: Icone ToggleLeft/ToggleRight con colori distintivi (verde attivo, grigio inattivo)
- **Smart Synchronization**: Lo stato del toggle si sincronizza automaticamente con le selezioni manuali
- **Intuitive Labels**: "Seleziona Tutte" / "Deseleziona Tutte" per chiarezza immediata

#### Dashboard Implementation
- **Overview Dashboard**: Implementato nel componente Dashboard.tsx
- **Advanced Analytics**: Implementato nel componente AdvancedDashboard.tsx
- **Intelligent Analysis**: Implementato nel componente IntelligentAnalysis.tsx
- **Consistent Behavior**: Logica unificata in tutte le dashboard

#### Technical Improvements
- **Automatic State Sync**: useEffect per sincronizzazione automatica dello stato
- **Filter Integration**: Integrazione perfetta con il sistema di filtri esistente
- **Reset Compatibility**: Il pulsante "Cancella filtri" resetta anche il toggle
- **Performance Optimized**: Logica efficiente senza impatti sulle performance

### 📚 Documentation
- **Feature Guide**: Aggiunto `docs/CATEGORY_TOGGLE_FEATURE.md` con documentazione completa
- **Implementation Details**: Spiegazione tecnica della logica di sincronizzazione
- **Use Cases**: Scenari d'uso e benefici per l'utente
- **Testing Guidelines**: Checklist per test manuali

### 💻 Developer Experience
- **TypeScript Support**: Implementazione completamente tipizzata
- **Code Consistency**: Pattern uniforme riutilizzabile
- **Maintainability**: Codice pulito e ben documentato
- **Extensibility**: Facilmente estendibile ad altre sezioni di filtro
