# 🔐 Backup Cifrati - Documentazione

## Panoramica

La funzionalità di **Backup Cifrati** di pFinance consente di esportare e importare tutti i dati del database in modo completamente sicuro, utilizzando cifratura AES-256-GCM di livello militare. Questa funzionalità è progettata per proteggere i tuoi dati finanziari sensibili durante l'archiviazione e il trasferimento.

## 🚀 Caratteristiche Principali

### Sicurezza
- **Cifratura AES-256-GCM**: Algoritmo di cifratura autenticata di livello militare
- **PBKDF2**: Derivazione delle chiavi con 100.000 iterazioni per resistere agli attacchi brute-force
- **Salt unico**: Ogni backup utilizza un salt crittograficamente sicuro
- **Controllo integrità**: Checksum SHA-256 per verificare l'integrità dei dati
- **Gestione sicura della memoria**: Cancellazione delle password e chiavi dalla memoria

### Funzionalità
- **Backup completi**: Include transazioni, categorie, regole, saldi e audit log
- **Filtri temporali**: Backup selettivi per intervalli di date specifici
- **Opzioni flessibili**: Scelta di includere/escludere categorie, regole e storico saldi
- **Compatibilità backward**: I backup JSON esistenti continuano a funzionare
- **Interfaccia intuitiva**: UI semplice con validazione password in tempo reale

## 📁 Formato dei File

### File Cifrati (.enc)
```json
{
  "header": {
    "version": "2.0.0",
    "algorithm": "AES-256-GCM",
    "created_at": "2024-01-01T12:00:00.000Z",
    "salt": "hexadecimal_salt_string",
    "checksum": "sha256_checksum_16char"
  },
  "data": "encrypted_payload_string"
}
```

### Struttura Dati Interno
Il payload decifrato contiene:
```json
{
  "version": "2.0.0-encrypted",
  "created_at": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "total_transactions": 1000,
    "total_categories": 25,
    "total_rules": 50,
    "date_range": { "from": "2023-01-01", "to": "2024-01-01" },
    "database_stats": { ... }
  },
  "transactions": [ ... ],
  "categories": [ ... ],
  "category_rules": [ ... ],
  "file_balances": [ ... ],
  "balance_audit_log": [ ... ]
}
```

## 🔧 Come Utilizzare

### Creare un Backup Cifrato

1. **Accedi alle Impostazioni**: Dashboard → Settings → Database Backup
2. **Attiva Cifratura**: Spunta "Backup Cifrato (Raccomandato)"
3. **Imposta Password**: 
   - Inserisci una password sicura (minimo 8 caratteri)
   - Conferma la password nel campo di verifica
4. **Configura Opzioni**: Seleziona periodo e contenuti da includere
5. **Crea Backup**: Clicca "Crea Backup Cifrato"
6. **Salva File**: Il browser scaricherà un file `.enc`

### Ripristinare da Backup Cifrato

1. **Accedi al Restore**: Dashboard → Settings → Database Restore  
2. **Seleziona File**: Scegli un file `.enc` dal tuo computer
3. **Inserisci Password**: Digita la password utilizzata per la cifratura
4. **Configura Opzioni**: Scegli se sostituire i dati esistenti
5. **Inizia Restore**: Clicca "Inizia Restore Cifrato"
6. **Verifica Risultati**: Controlla il riepilogo delle operazioni

## 🔒 Sicurezza e Best Practices

### Password Sicure
- **Lunghezza minima**: 8 caratteri
- **Complessità**: Usa lettere, numeri e simboli
- **Unicità**: Non riutilizzare password di altri servizi
- **Storage**: Conserva le password in un password manager

### Gestione Backup
- **Archiviazione sicura**: Conserva i backup in luoghi protetti
- **Backup regolari**: Crea backup periodici dei dati importanti
- **Test di restore**: Verifica periodicamente che i backup funzionino
- **Versioning**: Mantieni più versioni di backup per sicurezza

### Considerazioni di Sicurezza
- I backup sono protetti solo quanto la password utilizzata
- La perdita della password rende impossibile il recupero dei dati
- I file cifrati sono più grandi dei JSON normali (~30-40% overhead)
- La cifratura/decifratura richiede più tempo e CPU

## 🔄 Compatibilità

### Backup Esistenti
- **JSON Legacy**: I backup `.json` esistenti continuano a funzionare
- **Migrazione**: Non è necessaria migrazione automatica
- **Coesistenza**: Puoi avere sia backup cifrati che non cifrati

### Versioni
- **v2.0.0+**: Supporto completo per backup cifrati
- **v1.x**: Solo backup JSON (legacy)
- **Upgrade**: La funzionalità è disponibile immediatamente dopo l'aggiornamento

## 🛠️ API Endpoints

### Backup Cifrato
```http
POST /api/database/encrypted-backup
Content-Type: application/json

{
  "password": "your_secure_password",
  "startDate": "2023-01-01",
  "endDate": "2024-01-01",
  "includeCategories": true,
  "includeRules": true,
  "includeBalanceHistory": true
}
```

**Response**: File `.enc` in download

### Restore Cifrato
```http
POST /api/database/encrypted-restore
Content-Type: multipart/form-data

file: backup_file.enc
password: your_secure_password  
replaceExisting: false
```

**Response**:
```json
{
  "success": true,
  "message": "Restore completato con successo",
  "results": {
    "transactions": { "inserted": 100, "duplicates": 5 },
    "categories": { "inserted": 10, "errors": 0 },
    "rules": { "inserted": 20, "errors": 0 },
    "file_balances": { "inserted": 3, "errors": 0 }
  },
  "backup_metadata": { ... }
}
```

## ⚠️ Limitazioni e Considerazioni

### Limitazioni Tecniche
- **Dimensione massima**: 100MB per file di backup
- **Password**: Massimo 1024 caratteri per prevenire DoS
- **Browser**: Funziona solo con JavaScript abilitato
- **Memoria**: Backup molto grandi possono richiedere più RAM

### Scenari Non Supportati
- **Backup automatici programmati**: Solo backup manuali
- **Cifratura ibrida**: Non si può cifrare solo parti del backup
- **Recupero password**: Nessun sistema di recupero password
- **Sincronizzazione cloud**: Non integrato con servizi cloud

## 🐛 Risoluzione Problemi

### Errori Comuni

**"Password errata o file corrotto"**
- Verifica che la password sia corretta
- Controlla che il file non sia danneggiato
- Assicurati di usare il file originale non modificato

**"File troppo grande"**
- I backup cifrati hanno overhead del 30-40%
- Usa filtri temporali per ridurre le dimensioni
- Considera backup multipli per periodi più piccoli

**"Errore durante la cifratura"**
- Verifica di avere RAM sufficiente
- Riprova con un browser diverso
- Controlla la console per errori JavaScript

### Log di Debug
I dettagli degli errori sono volutamente limitati per sicurezza. Per debug:
1. Apri Developer Tools del browser
2. Vai alla tab Console
3. Riprova l'operazione e controlla i messaggi

## 📞 Supporto

Per problemi specifici sui backup cifrati:
1. Controlla questa documentazione
2. Verifica i log della console browser
3. Testa con backup più piccoli
4. Verifica la password utilizzata

## 🔮 Roadmap Futura

### Funzionalità Pianificate
- **Backup automatici**: Programmazione backup ricorrenti
- **Compressione**: Riduzione dimensioni file cifrati  
- **Multi-password**: Supporto per più password di decifratura
- **Cloud integration**: Sincronizzazione con servizi cloud cifrati
- **Backup incrementali**: Solo le modifiche dall'ultimo backup

---

**Versione Documentazione**: 2.0.0  
**Ultimo Aggiornamento**: Gennaio 2025  
**Compatibilità**: pFinance v2.0.0+