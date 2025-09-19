# 🎛️ Toggle "Seleziona/Deseleziona Tutte" per le Categorie

## Panoramica

È stata aggiunta una nuova funzionalità di switch nei moduli "Filtri Avanzati" delle dashboard che permette di selezionare o deselezionare tutte le categorie con un semplice clic.

## 📍 Posizioni Implementate

Lo switch è stato implementato nei seguenti componenti:

1. **Overview Dashboard** (`Dashboard.tsx`)
2. **Advanced Analytics** (`AdvancedDashboard.tsx`) 
3. **Intelligent Analysis** (`IntelligentAnalysis.tsx`)

## 🔧 Funzionalità

### Comportamento dello Switch

- **🟢 Stato Attivato** (`Deseleziona Tutte`):
  - Mostra icona `ToggleRight` verde
  - Indica che tutte le categorie specifiche sono selezionate
  - Cliccando passerà allo stato "Tutte" (deseleziona tutto)

- **🔴 Stato Disattivato** (`Seleziona Tutte`):
  - Mostra icona `ToggleLeft` grigia  
  - Indica che non tutte le categorie sono selezionate
  - Cliccando selezionerà tutte le categorie specifiche

### Logica di Sincronizzazione

Lo stato dello switch si sincronizza automaticamente con le selezioni delle categorie:

```typescript
useEffect(() => {
  if (selectedCategories.has('Tutte')) {
    setAllCategoriesSelected(false);
  } else {
    const totalSpecificCategories = availableCategories.filter(cat => cat !== 'Tutte').length;
    const selectedSpecificCategories = Array.from(selectedCategories).filter(cat => cat !== 'Tutte').length;
    setAllCategoriesSelected(selectedSpecificCategories === totalSpecificCategories && totalSpecificCategories > 0);
  }
}, [selectedCategories, availableCategories]);
```

### Funzione Toggle

```typescript
const toggleAllCategories = () => {
  if (allCategoriesSelected) {
    // Deseleziona tutte le categorie tranne 'Tutte'
    setSelectedCategories(new Set(['Tutte']));
    setAllCategoriesSelected(false);
  } else {
    // Seleziona tutte le categorie disponibili tranne 'Tutte'
    const allSpecificCategories = availableCategories.filter(cat => cat !== 'Tutte');
    setSelectedCategories(new Set(allSpecificCategories));
    setAllCategoriesSelected(true);
  }
};
```

## 🎨 Interfaccia Utente

### Posizione

Lo switch è posizionato nell'header della sezione "Categorie" all'interno dei "Filtri Avanzati":

```tsx
<div className="flex items-center justify-between mb-2">
  <h4 className="font-medium">Categorie</h4>
  <button
    onClick={toggleAllCategories}
    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
    title={allCategoriesSelected ? 'Deseleziona tutte le categorie' : 'Seleziona tutte le categorie'}
  >
    {allCategoriesSelected ? (
      <>
        <ToggleRight className="h-4 w-4 text-green-600" />
        Deseleziona Tutte
      </>
    ) : (
      <>
        <ToggleLeft className="h-4 w-4 text-gray-400" />
        Seleziona Tutte
      </>
    )}
  </button>
</div>
```

### Stili

- **Icone**: Lucide React icons (`ToggleLeft`, `ToggleRight`)
- **Colori**: 
  - Verde (`text-green-600`) per stato attivo
  - Grigio (`text-gray-400`) per stato inattivo
- **Hover**: Transizione al colore primario
- **Tooltip**: Descrizione dell'azione su hover

## 🔄 Integrazione con i Filtri

### Compatibilità

Lo switch si integra perfettamente con il sistema di filtri esistente:

- **Reset Filtri**: Il pulsante "Cancella filtri" reimposta anche lo stato del toggle
- **Selezione Manuale**: Le selezioni/deselezioni manuali aggiornano automaticamente lo stato dello switch
- **Navigazione**: Lo stato viene preservato durante la navigazione tra sezioni

### Reset Globale

```typescript
const clearAllFilters = () => {
  setSelectedCategories(new Set(['Tutte']));
  setSelectedYears(new Set(['Tutti']));
  setSelectedMonths(new Set(['Tutti']));
  setAllCategoriesSelected(true); // Reset anche il toggle
};
```

## 🧪 Casi d'Uso

### Scenario 1: Analisi Completa
1. Utente vuole vedere tutti i dati
2. Clicca "Seleziona Tutte" → tutte le categorie vengono selezionate
3. I grafici mostrano dati di tutte le categorie contemporaneamente

### Scenario 2: Focus Specifico  
1. Utente ha selezionato tutte le categorie
2. Clicca "Deseleziona Tutte" → solo "Tutte" rimane selezionato
3. I grafici mostrano dati aggregati

### Scenario 3: Selezione Parziale
1. Utente seleziona manualmente alcune categorie
2. Lo switch mostra "Seleziona Tutte" (stato inattivo)
3. Può completare la selezione con un clic

## 🔍 Testing

### Test Manuali da Eseguire

1. **Test di Stato Iniziale**:
   - Caricare una dashboard
   - Verificare che lo switch mostri lo stato corretto

2. **Test di Toggle**:
   - Cliccare lo switch e verificare il cambio di stato
   - Verificare che i filtri si aggiornino correttamente

3. **Test di Sincronizzazione**:
   - Selezionare/deselezionare categorie manualmente
   - Verificare che lo switch si aggiorni automaticamente

4. **Test di Reset**:
   - Usare il pulsante "Cancella filtri"
   - Verificare che anche lo switch si resetti

## 📱 Responsive Design

Lo switch mantiene la sua usabilità su tutti i dispositivi:

- **Desktop**: Testo completo visibile ("Seleziona Tutte" / "Deseleziona Tutte")
- **Mobile**: Layout mantenuto grazie a `flex` e `gap`
- **Touch**: Area di clic sufficientemente grande per touch screens

## 🚀 Benefici dell'Implementazione

### Per l'Utente
- **Efficienza**: Un clic invece di molti clic individuali
- **Chiarezza**: Stato visivo immediato
- **Flessibilità**: Facile passaggio tra vista completa e vista filtrata

### Per lo Sviluppo
- **Consistenza**: Implementazione uniforme in tutte le dashboard
- **Manutenibilità**: Logica centralizzata e riutilizzabile
- **Estensibilità**: Facile da adattare per altre sezioni di filtro

## 🔮 Possibili Estensioni Future

1. **Animazioni**: Aggiungere transizioni più fluide al toggle
2. **Shortcuts**: Supporto per shortcuts da tastiera (Ctrl+A)
3. **Persistenza**: Salvare lo stato del toggle nelle preferenze utente
4. **Bulk Actions**: Estendere il concetto ad altre sezioni di filtro (Anni, Mesi)

---

**Versione**: 2.0.1  
**Data Implementazione**: Gennaio 2025  
**Compatibilità**: Tutti i browser moderni