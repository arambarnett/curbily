import Papa from 'papaparse';
import { collection, addDoc, writeBatch, doc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CanonicalRate, DimPosition, DimLocalMap, DimSchedule } from '../types';

export const dataIngestionService = {
  async processCoreFolder() {
    // This expects files at /csv/core/
    // Since we are client-side, we might need to fetch them or assume they are static assets
    // For this environment, we'll assume they are available at a public URL or we can read them if paths were mapped.
    // However, the best way in this app is to have an "Admin Upload" 
  },

  async ingestCsvData(csvContent: string, sourceFile: string, domain: 'core' | 'iatse') {
    const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const data = results.data as any[];
    
    const batch = writeBatch(db);
    const now = Timestamp.now();

    for (const row of data) {
      const rateRef = doc(collection(db, 'canonicalRates'));
      
      // Parse dates safely
      const parseDate = (val: string) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
      };

      const start = parseDate(row.effective_start) || now;
      const end = parseDate(row.effective_end) || Timestamp.fromDate(new Date('2099-12-31'));

      const rate: Omit<CanonicalRate, 'id'> = {
        union: row.union || 'Unknown',
        agreementCode: row.agreement_code || '',
        track: row.track as any,
        scheduleNumber: row.schedule_number,
        scheduleName: row.schedule_name,
        occCode: row.occ_code || 'N/A',
        classification: row.classification || 'N/A',
        rateType: (row.rate_type?.toLowerCase() || 'day') as any,
        amountUsd: parseFloat(row.amount_usd.replace(/[^0-9.]/g, '')) || 0,
        effectiveStart: start,
        effectiveEnd: end,
        geographyState: row.geography_state,
        geographyCity: row.geography_city,
        localUnion: row.local_union,
        sourceFile: sourceFile,
        sourcePdfUrl: row.source_pdf_url,
        extractionConfidence: (row.extraction_confidence?.toLowerCase() || 'medium') as any,
        notes: row.notes,
        metadata: {
          domain,
          ingestedAt: now
        }
      };

      // Validation: Reject negative/non-numeric
      if (rate.amountUsd <= 0) continue;

      batch.set(rateRef, rate);

      // Auto-populate DimPosition if new
      // (Normally we'd do a check first, but for batch seed we might just collect set)
    }

    await batch.commit();
    return data.length;
  },

  async seedReferenceDimensions() {
    // This would build dim_positions from unique occ_codes in canonicalRates
    const ratesSnap = await getDocs(collection(db, 'canonicalRates'));
    const positions = new Map<string, DimPosition>();
    
    ratesSnap.docs.forEach(d => {
      const r = d.data() as CanonicalRate;
      const key = `${r.union}-${r.occCode}`;
      if (!positions.has(key)) {
        positions.set(key, {
          id: '',
          occCode: r.occCode,
          classification: r.classification,
          aliases: [r.classification],
          union: r.union
        });
      } else {
        const p = positions.get(key)!;
        if (!p.aliases.includes(r.classification)) {
          p.aliases.push(r.classification);
        }
      }
    });

    const batch = writeBatch(db);
    positions.forEach(p => {
      const ref = doc(collection(db, 'dimPositions'));
      batch.set(ref, p);
    });
    await batch.commit();
  }
};
