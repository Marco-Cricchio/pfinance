import { NextResponse } from 'next/server';
import { recategorizeAllTransactions, getParsedData } from '@/lib/database';

export async function POST() {
  try {
    // Usa la stessa funzione di categorizzazione dell'Excel parser
    const categorizeFunction = (description: string): string => {
      const desc = description.toLowerCase();
      
      // Mapping specifici personalizzati (priorità massima)
      if (desc.includes('pos due p') || desc.includes('pos pim') || desc.includes('pos pane e salame') || 
          desc.includes('pos in\'s mercato') || desc.includes('pos macelleria') || desc.includes('arcaplanet') ||
          desc.includes('pos stazione frutta') || desc.includes('pos famila') || 
          desc.includes('pos vollera carmine') || desc.includes('pos buscaini angelo') ||
          desc.includes('pim cc') || desc.includes('due p 2010') || desc.includes('pim torresina') ||
          desc.includes('macelleria salumeria') || desc.includes('stazione frutta') ||
          desc.includes('in\'s mercato') || desc.includes('pane e salame') || desc.includes('global fish')) {
        return 'Alimenti';
      }
      if (desc.includes('pos cossuto') || desc.includes('pos brico point') || desc.includes('pos la satur') ||
          desc.includes('pos maury') || desc.includes('deghi s p a') || desc.includes('tedi') ||
          desc.includes('maury') || desc.includes('cossuto torrevecchia')) {
        return 'Casa';
      }
      if (desc.includes('pos acqu.distrib') || desc.includes('pos caffe la stella') || 
          desc.includes('pos mirko') || desc.includes('pos caffe valentini') ||
          desc.includes('acqu.distrib.automati') || desc.includes('mirko s.r.l.') ||
          desc.includes('masieri alessandro')) {
        return 'Bar';
      }
      if (desc.includes('pos windsurf') || desc.includes('pos claude.ai') || desc.includes('pos openrouter') ||
          desc.includes('pos requesty') || desc.includes('pos anthropic') || desc.includes('roblox') ||
          desc.includes('pos base44.com')) {
        return 'Abbonamenti';
      }
      if (desc.includes('pos tabacchi masieri') || desc.includes('pos masieri') ||
          desc.includes('pos ricevitoria')) {
        return 'Tabacchi';
      }
      if (desc.includes('pos kiabi') || desc.includes('pos cisalfa')) {
        return 'Abbigliamento';
      }
      if (desc.includes('pos enerpetroli') || desc.includes('enerpetroli') || desc.includes('octopus electroverse') ||
          desc.includes('boccea gomme')) {
        return 'Trasporti';
      }
      if (desc.includes('bollettino roma capitale')) {
        return 'Scuola';
      }
      if (desc.includes('pos casa novecento') || desc.includes('pos elior') || desc.includes('pos lievito') ||
          desc.includes('pos mc donald\'s') || desc.includes('pos deliveroo') || desc.includes('pos aperegina') ||
          desc.includes('la villetta') || desc.includes('four sisters') || desc.includes('justeatitaly') ||
          desc.includes('pizza & alici') || desc.includes('jimmy\'s') || desc.includes('alice pizza') ||
          desc.includes('agriresort') || desc.includes('az.agricol') || desc.includes('la brustola') ||
          desc.includes('gianni pizza al matton')) {
        return 'Ristorazione';
      }
      if (desc.includes('paypal *buy differe')) {
        return 'Noleggio_Cell';
      }
      if (desc.includes('pos farmaci torresina') || desc.includes('fanelli gianluigi') ||
          desc.includes('centro diagnostico')) {
        return 'Salute';
      }
      if (desc.includes('michetti elena') || desc.includes('pos sumup *quantestorieli') ||
          desc.includes('s.s.d. stelle marine') || desc.includes('fantasy paper')) {
        return 'Daniele';
      }
      if (desc.includes('pos augustarello')) {
        return 'Benessere';
      }
      if (desc.includes('pos chiosco') || desc.includes('pos piscine di vicenza') ||
          desc.includes('uci parco leonardo') || desc.includes('uci cinemas') || desc.includes('cc the wow')) {
        return 'Svago';
      }
      if (desc.includes('0689386461')) {
        return 'Utenze';
      }
      if (desc.includes('unaway hotel occhiobe') || desc.includes('pos a point') || desc.includes('th cadore') ||
          desc.includes('pos parkplatz') || desc.includes('pos talschlusshuette') || desc.includes('pos kaesereigen') ||
          desc.includes('pos adeg ebner') || desc.includes('pos spar') || desc.includes('pos loacker') ||
          desc.includes('pos mne*95023926happacher_') || desc.includes('sesto op') || desc.includes('pos nkd') ||
          desc.includes('pos billa') || desc.includes('pos hpb kassa') || desc.includes('bagnolo san') ||
          desc.includes('pos wycon') || desc.includes('pos terni reti') || desc.includes('pos cascata delle marmore') ||
          desc.includes('pos bkg*booking.com')) {
        return 'Viaggi';
      }
      
      // Condominio (priorità alta prima di bonifici generici)
      if (desc.includes('condominio')) {
        return 'Condominio';
      }
      
      // Mutuo (priorità alta prima di bonifici generici)
      if (desc.includes('per mut') || desc.includes('mutuo')) {
        return 'Mutuo';
      }
      
      // Assicurazioni (priorità alta prima di bonifici generici)
      if (desc.includes('assicurazione') || desc.includes('polizza') || desc.includes('generali') || desc.includes('axa') ||
          desc.includes('allianz') || desc.includes('unipol') || desc.includes('zurich')) {
        return 'Assicurazioni';
      }
      
      // Entrate (priorità alta)
      if (desc.includes('stipendio') || desc.includes('salary') || desc.includes('bonifico in entrata') || 
          desc.includes('accredito stipendio') || desc.includes('cedolino')) {
        return 'Stipendio';
      }
      if (desc.includes('pensione') || desc.includes('inps')) {
        return 'Pensione';
      }
      if (desc.includes('rimborso') || desc.includes('restituzione') || desc.includes('cashback')) {
        return 'Rimborsi';
      }
      
      // Spese bancarie e servizi
      if (desc.includes('commissioni') || desc.includes('spese') || desc.includes('canone') || 
          desc.includes('imposta di bollo') || desc.includes('bollo')) {
        return 'Spese Bancarie';
      }
      if (desc.includes('prelievo') || desc.includes('atm') || desc.includes('bancomat')) {
        return 'Prelievi';
      }
      if (desc.includes('bonifico') || desc.includes('giroconto') || desc.includes('trasferimento')) {
        return 'Trasferimenti';
      }
      
      // Spese quotidiane generiche
      if (desc.includes('supermercato') || desc.includes('alimentari') || desc.includes('grocery') || 
          desc.includes('conad') || desc.includes('coop') || desc.includes('esselunga') || desc.includes('carrefour') ||
          desc.includes('lidl') || desc.includes('eurospin') || desc.includes('penny') || desc.includes('md')) {
        return 'Alimenti';
      }
      if (desc.includes('benzina') || desc.includes('carburante') || desc.includes('fuel') || 
          desc.includes('eni') || desc.includes('agip') || desc.includes('q8') || desc.includes('esso') ||
          desc.includes('ip') || desc.includes('tamoil')) {
        return 'Trasporti';
      }
      if (desc.includes('ristorante') || desc.includes('restaurant') || desc.includes('pizzeria') || 
          desc.includes('trattoria') || desc.includes('osteria') || desc.includes('mcdonald') || 
          desc.includes('burger') || desc.includes('kfc')) {
        return 'Ristorazione';
      }
      if (desc.includes('bar') || desc.includes('caffe') || desc.includes('caffetteria')) {
        return 'Bar';
      }
      
      // Casa e utenze
      if (desc.includes('affitto') || desc.includes('rent') || desc.includes('mutuo') || 
          desc.includes('condominio') || desc.includes('amministratore') || desc.includes('brico') ||
          desc.includes('ferramenta') || desc.includes('casa')) {
        return 'Casa';
      }
      if (desc.includes('utenze') || desc.includes('luce') || desc.includes('gas') || desc.includes('acqua') ||
          desc.includes('enel') || desc.includes('eni plenitude') || desc.includes('utilities') ||
          desc.includes('tim') || desc.includes('vodafone') || desc.includes('wind') || desc.includes('iliad') ||
          desc.includes('telecom') || desc.includes('internet') || desc.includes('telefono')) {
        return 'Utenze';
      }
      
      // Altri trasporti
      if (desc.includes('trasporti') || desc.includes('autobus') || desc.includes('metro') || 
          desc.includes('trenitalia') || desc.includes('atac') || desc.includes('transport') ||
          desc.includes('taxi') || desc.includes('uber') || desc.includes('parcheggio') ||
          desc.includes('ztl') || desc.includes('autostrada') || desc.includes('pedaggio')) {
        return 'Trasporti';
      }
      
      // Salute
      if (desc.includes('medico') || desc.includes('farmacia') || desc.includes('health') || 
          desc.includes('ospedale') || desc.includes('clinica') || desc.includes('dentista') ||
          desc.includes('veterinario') || desc.includes('analisi') || desc.includes('medicina') ||
          desc.includes('farmaci')) {
        return 'Salute';
      }
      
      // Abbigliamento e shopping
      if (desc.includes('abbigliamento') || desc.includes('clothing') || desc.includes('zara') || 
          desc.includes('h&m') || desc.includes('decathlon') || desc.includes('ovs') || desc.includes('coin')) {
        return 'Abbigliamento';
      }
      if (desc.includes('shopping') || desc.includes('amazon') || desc.includes('ebay') ||
          desc.includes('mediaworld') || desc.includes('unieuro') || desc.includes('ikea')) {
        return 'Shopping';
      }
      
      // Intrattenimento e abbonamenti
      if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('entertainment') || 
          desc.includes('cinema') || desc.includes('teatro') || desc.includes('disney') || 
          desc.includes('amazon prime') || desc.includes('apple music') || desc.includes('youtube') ||
          desc.includes('playstation') || desc.includes('xbox') || desc.includes('steam')) {
        return 'Abbonamenti';
      }
      
      // Tasse e scuola
      if (desc.includes('tasse') || desc.includes('f24') || desc.includes('agenzia entrate') ||
          desc.includes('imu') || desc.includes('tari') || desc.includes('bollo auto') ||
          desc.includes('multa') || desc.includes('sanzione')) {
        return 'Tasse';
      }
      if (desc.includes('scuola') || desc.includes('universit') || desc.includes('istruzione') ||
          desc.includes('roma capitale')) {
        return 'Scuola';
      }
      
      // Tabacchi
      if (desc.includes('tabacchi') || desc.includes('tabaccheria')) {
        return 'Tabacchi';
      }
      
      
      return 'Altro';
    };

    // Esegui la ricategorizzazione
    const updatedCount = recategorizeAllTransactions(categorizeFunction);
    
    // Recupera i dati aggiornati
    const updatedData = getParsedData();
    
    return NextResponse.json({
      success: true,
      message: `Ricategorizzate ${updatedCount} transazioni`,
      updatedCount,
      data: updatedData
    });
    
  } catch (error) {
    console.error('Errore ricategorizzazione:', error);
    return NextResponse.json(
      { error: 'Errore durante la ricategorizzazione delle transazioni' }, 
      { status: 500 }
    );
  }
}