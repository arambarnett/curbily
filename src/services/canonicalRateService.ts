import { 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  writeBatch,
  doc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CanonicalRate, DimPosition, DimLocalMap, DimSchedule, Project } from '../types';

export interface RateQueryParams {
  positionTitle?: string;
  occCode?: string;
  union?: string;
  geographyState?: string;
  geographyCity?: string;
  productionType?: Project['contentType'];
  budgetTier?: string;
  track?: 'Majors' | 'Independents' | 'Basic' | 'Other';
  workPattern?: 'studio' | 'distant';
  workDate?: Date;
}

export interface RateSelectionResult {
  selectedRate?: CanonicalRate;
  alternates: CanonicalRate[];
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  verificationNote?: string;
  // New IATSE/Exhaustive fields
  input_summary?: any;
  selected_results?: any[];
  warnings?: string[];
  source_trace?: any[];
}

// Canonical Budget Tier Normalization
const TIER_MAPPING: Record<string, string> = {
  'micro': 'SPA',
  'micro-budget': 'SPA',
  'ultra low': 'ULA',
  'low': 'LBA',
  'moderate low': 'MLB',
  'tier 1': 'Tier 1',
  'tier 2': 'Tier 2',
  'tier 3': 'Tier 3',
  'major studio': 'BA',
  'short film': 'SPA',
  'new media': 'New Media',
  'non-union skeleton crew': 'Non-Union'
};

export const canonicalRateService = {
  async queryMinimumRate(params: RateQueryParams): Promise<RateSelectionResult> {
    const {
      positionTitle,
      occCode,
      union,
      geographyState,
      geographyCity,
      productionType,
      budgetTier,
      track,
      workPattern,
      workDate = new Date()
    } = params;

    const normalizedTier = budgetTier ? TIER_MAPPING[budgetTier.toLowerCase()] || budgetTier : undefined;

    // 1. Resolve Local Union if geography is provided
    let likelyLocals: string[] = [];
    if (geographyState && geographyCity) {
      const q = query(
        collection(db, 'dimLocalMap'),
        where('state', '==', geographyState),
        where('city', '==', geographyCity)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        likelyLocals = (snap.docs[0].data() as DimLocalMap).likelyLocals;
      }
    }

    // 2. Resolve Position Aliases if title is provided but no occCode
    let searchCodes = occCode ? [occCode] : [];
    let searchClassifications = positionTitle ? [positionTitle] : [];
    
    if (positionTitle && !occCode) {
      const q = query(
        collection(db, 'dimPositions'),
        where('aliases', 'array-contains', positionTitle)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(doc => {
        const d = doc.data() as DimPosition;
        searchCodes.push(d.occCode);
        searchClassifications.push(d.classification);
      });
    }

    // 3. Query Canonical Rates
    // We'll fetch a broad set and filter in memory for complex logic
    let ratesQuery = collection(db, 'canonicalRates') as any;
    
    // Initial coarse filters
    if (union) {
      ratesQuery = query(ratesQuery, where('union', '==', union));
    }
    
    const snapshot = await getDocs(ratesQuery);
    let candidates = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as CanonicalRate));

    // 4. Memory filtering and Prize selection
    // Priority A: Exact occ_code + union + schedule + date window
    // Priority B: Exact classification alias + union + schedule + date window
    
    const filtered = candidates.filter(r => {
      // Date Window Check
      const start = r.effectiveStart?.toDate ? r.effectiveStart.toDate() : new Date(r.effectiveStart);
      const end = r.effectiveEnd?.toDate ? r.effectiveEnd.toDate() : new Date(r.effectiveEnd);
      if (workDate < start || workDate > end) return false;

      // Position Check
      const matchesPosition = 
        (occCode && r.occCode === occCode) || 
        (positionTitle && (r.classification === positionTitle || r.notes?.includes(positionTitle)));
      
      if (!matchesPosition && searchCodes.length > 0) {
        if (!searchCodes.includes(r.occCode)) return false;
      } else if (!matchesPosition) {
        return false;
      }

      // Tier/Context Check (e.g., SAG Theatrical Tiers)
      if (normalizedTier && r.agreementCode?.includes(normalizedTier)) {
        // High match
      } else if (normalizedTier && !r.agreementCode?.includes(normalizedTier)) {
        // If the rate is tier-specific but doesn't match our tier, skip
        const tierKeywords = ['ULA', 'MLB', 'LBA', 'BA', 'SPA'];
        if (tierKeywords.some(tk => r.agreementCode?.includes(tk) || r.scheduleName?.includes(tk))) {
          return false;
        }
      }

      // Track Check
      if (track && r.track && r.track !== track) return false;

      // Work Pattern Check (Local vs Distant)
      if (workPattern === 'distant' && r.scheduleName?.toLowerCase().includes('studio')) return false;
      if (workPattern === 'studio' && r.scheduleName?.toLowerCase().includes('distant')) return false;

      return true;
    });

    // Sort by specificity and date
    const sorted = filtered.sort((a, b) => {
      // Most specific schedule wins (e.g. ones with track or local union matches)
      const aSpecificity = (a.localUnion ? 2 : 0) + (a.track ? 1 : 0);
      const bSpecificity = (b.localUnion ? 2 : 0) + (b.track ? 1 : 0);
      if (aSpecificity !== bSpecificity) return bSpecificity - aSpecificity;
      
      // Newest effective date
      const aStart = a.effectiveStart?.toMillis ? a.effectiveStart.toMillis() : new Date(a.effectiveStart).getTime();
      const bStart = b.effectiveStart?.toMillis ? b.effectiveStart.toMillis() : new Date(b.effectiveStart).getTime();
      return bStart - aStart;
    });

    const result: RateSelectionResult = {
      selectedRate: sorted[0],
      alternates: sorted.slice(1, 4),
      explanation: "",
      confidence: sorted[0]?.extractionConfidence || 'low',
      input_summary: params,
      warnings: [],
      source_trace: []
    };

    if (result.selectedRate) {
      result.explanation = `Selected based on ${result.selectedRate.union} ${result.selectedRate.scheduleName || result.selectedRate.agreementCode || 'General Schedule'}. `;
      if (result.selectedRate.localUnion) result.explanation += `Matched local union ${result.selectedRate.localUnion}. `;
      if (result.selectedRate.track) result.explanation += `Targeted ${result.selectedRate.track} track. `;
      
      result.selected_results = [result.selectedRate];
      result.source_trace = [{
        source_file: result.selectedRate.sourceFile,
        source_pdf_url: result.selectedRate.sourcePdfUrl,
        effective_start: result.selectedRate.effectiveStart,
        effective_end: result.selectedRate.effectiveEnd
      }];

      if (result.selectedRate.extractionConfidence !== 'high') {
        result.warnings?.push("Confidence is not high. Verify against original PDF grid before payroll use.");
      }
    } else {
      result.explanation = "No exact minimum found for specified criteria. Candidates were found but did not match tracking, date, or geographical constraints.";
      result.warnings?.push("No absolute match. Check if schedule, track, or local union inputs are missing.");
    }

    return result;
  },

  async ingestFromCsv(data: any[], sourceFile: string) {
    const batch = writeBatch(db);
    let count = 0;
    
    data.forEach(row => {
      // User directive: Keep only rows where union is IATSE-related 
      // or row_kind = rate when union is blank but source file is IATSE
      const isIatseSource = sourceFile.toLowerCase().includes('iatse');
      const rowKind = row.row_kind || row.row_type;
      
      let union = row.union;
      if (!union && isIatseSource && rowKind === 'rate') {
        union = 'IATSE';
      }

      // Filter out non-rate rows if row_kind is provided
      if (rowKind && rowKind.toLowerCase() !== 'rate') return;
      
      // Basic validity check
      if (!union) return;

      const rateRef = doc(collection(db, 'canonicalRates'));
      const rate: Omit<CanonicalRate, 'id'> = {
        union: union,
        agreementCode: row.agreement_code || '',
        track: row.track as any || null,
        scheduleNumber: row.schedule_number || null,
        scheduleName: row.schedule_name || null,
        occCode: row.occ_code || 'N/A',
        classification: row.classification || 'N/A',
        rateType: (row.rate_type?.toLowerCase() || 'day') as any,
        amountUsd: parseFloat(String(row.amount_usd || 0).replace(/[^0-9.]/g, '')) || 0,
        effectiveStart: row.effective_start ? Timestamp.fromDate(new Date(row.effective_start)) : Timestamp.now(),
        effectiveEnd: row.effective_end ? Timestamp.fromDate(new Date(row.effective_end)) : Timestamp.fromDate(new Date('2099-12-31')),
        geographyState: row.geography_state || row.state || null,
        geographyCity: row.geography_city || row.city || null,
        localUnion: row.local_union || null,
        sourceFile: sourceFile,
        sourcePdfUrl: row.source_pdf_url || null,
        extractionConfidence: (row.extraction_confidence?.toLowerCase() || 'medium') as any,
        notes: row.notes || null,
        metadata: {
          domain: isIatseSource ? 'iatse' : 'core',
          ingestedAt: Timestamp.now()
        }
      };
      
      if (rate.amountUsd > 0) {
        batch.set(rateRef, rate);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  }
};
