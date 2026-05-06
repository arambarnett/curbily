import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { canonicalRateService } from './canonicalRateService';
import Papa from 'papaparse';
import { UnionRate, CanonicalRate } from '../types';
import { DGA_SEED_RATES, SAG_SEED_RATES, WGA_SEED_RATES, IATSE_SEED_RATES } from '../lib/rateSeeds';

export const unionRateService = {
  async getRates() {
    const q = query(collection(db, 'unionRates'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnionRate));
  },

  async getCanonicalRates(union?: string, state?: string) {
    let q = query(collection(db, 'canonicalRates'));
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CanonicalRate));
    
    // Corrected state list based on Tier B data tracking: CA, AZ, TN, NY, GA, FL
    const stateAliases: Record<string, string[]> = {
      'CA': ['CA', 'California', 'Western', 'Hollywood', 'Local 80', 'Local 600', 'Local 700', 'Local 729', 'Local 800'],
      'NY': ['NY', 'New York', 'Eastern', 'Local 52', 'Local 161'],
      'GA': ['GA', 'Georgia', 'South', 'Atlanta', 'Local 479'],
      'AZ': ['AZ', 'Arizona', 'Local 480'],
      'TN': ['TN', 'Tennessee', 'Nashville', 'Local 492'],
      'FL': ['FL', 'Florida', 'Miami', 'Orlando', 'Local 477']
    };

    return all.filter(r => {
      const matchesUnion = !union || r.union === union || 
        (union === 'IATSE' && (r.union === 'IATSE' || r.union.startsWith('IATSE-')));
      
      let matchesLocation = !state || state === 'all';
      if (!matchesLocation && state) {
        const aliases = (stateAliases[state] || [state]).map(a => a.toLowerCase());
        const rateState = (r.geographyState || '').toLowerCase();
        const rateLocal = (r.localUnion || '').toLowerCase();
        const rateNotes = (r.notes || '').toLowerCase();
        
        matchesLocation = aliases.some(alias => 
          rateState.includes(alias) || 
          rateLocal.includes(alias) ||
          rateNotes.includes(alias)
        );
      }

      return matchesUnion && matchesLocation;
    });
  },

  async addRate(rate: Omit<UnionRate, 'id'>) {
    return await addDoc(collection(db, 'unionRates'), rate);
  },

  async updateRate(id: string, rate: Partial<UnionRate>) {
    const ref = doc(db, 'unionRates', id);
    return await updateDoc(ref, rate);
  },

  async deleteRate(id: string) {
    const ref = doc(db, 'unionRates', id);
    return await deleteDoc(ref);
  },

  getMinRate(role: string, location?: string): number {
    const commonRates: Record<string, number> = {
      'Production Assistant': 210,
      'Gaffer': 750,
      'Grip': 650,
      'Key Grip': 850,
      'Best Boy Electric': 650,
      'Electrician': 550,
      'Director of Photography': 2000,
      '1st AC': 850,
      '2nd AC': 650,
      'DIT': 1000,
      'Camera Operator': 1200,
      'Editor': 850,
      'Sound Mixer': 1000,
      'Boom Operator': 750,
      'Makeup Artist': 850,
      'Hair Stylist': 850,
      'Wardrobe Stylist': 950,
      'Art Director': 1100,
      'Production Designer': 1800,
      'Lead Man': 850,
      'Set Decorator': 1000,
      'Prop Master': 1000,
      'Script Supervisor': 850,
      'Director': 3000,
      'Producer': 2000,
      'Line Producer': 1800,
      'Production Manager': 1200,
      '1st AD': 1100,
      '2nd AD': 850,
      'Location Manager': 950,
      'Casting Director': 1100,
      'Set Medic': 750,
      'Studio Teacher': 650,
      'Craft Services': 750,
      'Transportation Coordinator': 850,
      'Driver': 650,
      'Storyboard Artist': 950,
      'Colorist': 1100,
      'VFX Artist': 1000,
      'Vendor': 0, // Vendors usually quote per project, but can have a base
      'Equipment Rental': 0
    };
    
    const normalized = role.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/assistant/g, 'asst')
      .replace(/production/g, 'prod');

    for (const [key, val] of Object.entries(commonRates)) {
      const normKey = key.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/assistant/g, 'asst')
        .replace(/production/g, 'prod');

      if (normKey.includes(normalized) || normalized.includes(normKey)) {
        return val;
      }
    }
    
    return 250;
  },

  async seedInitialRates() {
    const batch = writeBatch(db);
    const existing = await this.getRates();
    if (existing.length > 0) return; // Don't seed if data exists

    const initialRates: Omit<UnionRate, 'id'>[] = [
      // SAG-AFTRA Feature
      { union: 'SAG-AFTRA', contract: 'Theatrical Tier 1', tier: 'Head', role: 'Performer (Day)', rate: 1158, minRate: 1158, maxRate: 1500, unit: 'day', contentType: 'feature' },
      { union: 'SAG-AFTRA', contract: 'Theatrical Tier 1', tier: 'Head', role: 'Performer (Weekly)', rate: 4019, unit: 'week', contentType: 'feature' },
      { union: 'SAG-AFTRA', contract: 'Short Film', tier: 'Head', role: 'Performer (Day)', rate: 225, unit: 'day', contentType: 'short' },
      
      // DGA Feature
      { union: 'DGA', contract: 'Feature Film', tier: 'Head', role: 'Director', rate: 22000, minRate: 20000, maxRate: 35000, unit: 'week', contentType: 'feature' },
      { union: 'DGA', contract: 'Feature Film', tier: 'Key', role: 'Unit Production Manager', rate: 5800, unit: 'week', contentType: 'feature' },
      
      // IATSE Commercials
      { union: 'IATSE', contract: 'Commercial (National)', tier: 'Head', role: 'Director of Photography', rate: 4500, minRate: 3500, maxRate: 8000, unit: 'day', contentType: 'commercial' },
      { union: 'IATSE', contract: 'Commercial (National)', tier: 'Key', role: 'Gaffer', rate: 850, minRate: 750, maxRate: 1200, unit: 'day', contentType: 'commercial' },
      { union: 'IATSE', contract: 'Commercial (National)', tier: 'Key', role: 'Production Designer', rate: 1200, minRate: 1000, maxRate: 2500, unit: 'day', contentType: 'commercial' },
      
      // IATSE Features
      { union: 'IATSE', contract: 'Low Budget Feature', tier: 'Key', role: 'Gaffer', rate: 550, unit: 'day', contentType: 'feature' },
      { union: 'IATSE', contract: 'Low Budget Feature', tier: 'Second', role: 'Best Boy Electric', rate: 450, unit: 'day', contentType: 'feature' },
      
      // Teamsters
      { union: 'TEAMSTERS', contract: 'Major Studio', tier: 'Head', role: 'Transportation Coordinator', rate: 650, unit: 'day', contentType: 'feature' },
      { union: 'TEAMSTERS', contract: 'Major Studio', tier: 'Key', role: 'Driver', rate: 450, unit: 'day', contentType: 'feature' },
    ];

    initialRates.forEach(rate => {
      const ref = doc(collection(db, 'unionRates'));
      batch.set(ref, rate);
    });

    return await batch.commit();
  },

  async seedCanonicalRates(force: boolean = false) {
    if (!force) {
      const existing = await this.getCanonicalRates();
      if (existing.length > 0) return; // Don't seed if data exists
    }

    const allSeedRates = [
      ...DGA_SEED_RATES,
      ...SAG_SEED_RATES,
      ...WGA_SEED_RATES,
      ...IATSE_SEED_RATES
    ];

    // 1. Delete existing canonical rates in chunks of 500
    const existing = await this.getCanonicalRates();
    for (let i = 0; i < existing.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = existing.slice(i, i + 500);
      chunk.forEach(r => batch.delete(doc(db, 'canonicalRates', r.id)));
      await batch.commit();
    }

    // 2. Add new seed rates in chunks of 500
    for (let i = 0; i < allSeedRates.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = allSeedRates.slice(i, i + 500);
      chunk.forEach(rate => {
        const ref = doc(collection(db, 'canonicalRates'));
        batch.set(ref, {
          union: rate.union || 'Unknown',
          agreementCode: rate.agreementCode || null,
          track: rate.track || null,
          scheduleNumber: rate.scheduleNumber || null,
          scheduleName: rate.scheduleName || null,
          occCode: rate.occCode || 'N/A',
          classification: rate.classification || 'N/A',
          rateType: rate.rateType || 'day',
          amountUsd: rate.amountUsd || 0,
          effectiveStart: Timestamp.now(),
          effectiveEnd: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
          sourceFile: rate.sourceFile || 'Google Sheets Reference',
          extractionConfidence: rate.extractionConfidence || 'high',
          geographyState: rate.geographyState || null,
          geographyCity: rate.geographyCity || null,
          localUnion: rate.localUnion || null,
          notes: rate.notes || null,
          metadata: rate.metadata || { domain: 'core', ingestedAt: Timestamp.now() }
        });
      });
      await batch.commit();
    }
  },

  async syncIatseFromSheet() {
    // We now support multiple sheets to align with SAG and other union guidelines across tiers
    const sources = [
      { url: 'https://docs.google.com/spreadsheets/d/1JV5Tfk_ay714u76DhKFWbWt5z8odc-UHStw0hyg85uw/export?format=csv', name: 'IATSE_Tier_B_Local.csv', tier: 'Tier B' },
      { url: 'https://docs.google.com/spreadsheets/d/1aIsM6FnnS1iipVjQ_6HuoQJRgS0scbOlHQelK2Z30uU/export?format=csv', name: 'IATSE_Tier_A_National.csv', tier: 'Tier A' },
      { url: 'https://docs.google.com/spreadsheets/d/1wLr8uOkoZzt5wx9TaY2SiYYbUoFKFo6LQTaK68MJ-IY/export?format=csv', name: 'IATSE_Legacy_Combined.csv', tier: 'Legacy' }
    ];

    let totalImported = 0;

    // Helper to find a value regardless of header case/spacing
    const getVal = (row: any, ...keys: string[]) => {
      const rowKeys = Object.keys(row);
      for (const k of keys) {
        const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
        if (foundKey) return row[foundKey];
      }
      return null;
    };

    for (const source of sources) {
      try {
        console.log(`Syncing ${source.name}...`);
        const response = await fetch(source.url);
        if (!response.ok) {
          console.warn(`Source ${source.name} unreachable.`);
          continue;
        }
        
        const text = await response.text();
        const results = Papa.parse(text, { header: true, skipEmptyLines: true });
        const data = results.data as any[];
        
        const normalizedData = data.map(row => {
          // Extremely permissive mapping for Google Sheets CSV exports
          const amount = getVal(row, 'amount_usd', 'rate', 'amount', 'usd');
          const classification = getVal(row, 'classification', 'position', 'role', 'title');
          const unionLabel = getVal(row, 'union', 'org', 'union_name') || 'IATSE';
          const stateVal = getVal(row, 'state', 'geography_state', 'region', 'geography_State', 'geographyState');
          
          return {
            union: unionLabel,
            agreement_code: getVal(row, 'agreement_code', 'tier', 'contract'),
            track: getVal(row, 'track', 'context'),
            schedule_number: getVal(row, 'schedule_number', 'sch_no'),
            schedule_name: getVal(row, 'schedule_name', 'schedule'),
            occ_code: getVal(row, 'occ_code', 'code'),
            classification: classification,
            rate_type: getVal(row, 'rate_type', 'unit', 'per') || 'hour',
            amount_usd: amount,
            effective_start: getVal(row, 'effective_start', 'start_date', 'date'),
            effective_end: getVal(row, 'effective_end', 'end_date'),
            geography_state: stateVal,
            geography_city: getVal(row, 'city', 'geography_city', 'geography_City', 'location'),
            local_union: getVal(row, 'local_union', 'local'),
            source_pdf_url: getVal(row, 'source_pdf_url', 'pdf', 'url'),
            extraction_confidence: getVal(row, 'confidence', 'quality') || 'medium',
            notes: `${source.tier}: ${getVal(row, 'notes', 'comment') || ''}`
          };
        }).filter(r => r.amount_usd && r.classification); // Must have rate and role

        if (normalizedData.length > 0) {
          await canonicalRateService.ingestFromCsv(normalizedData, source.name);
          totalImported += normalizedData.length;
        }
      } catch (err) {
        console.error(`Failed to deep sync ${source.name}:`, err);
      }
    }
    
    return totalImported;
  },

  async getRatesForAgent() {
    const rates = await this.getRates();
    return rates.map(r => ({
      union: r.union,
      contract: r.contract,
      role: r.role,
      tier: r.tier,
      rate: r.rate,
      minRate: r.minRate,
      maxRate: r.maxRate,
      unit: r.unit,
      contentType: r.contentType
    }));
  },

  async getCanonicalRatesForAgent() {
    const rates = await this.getCanonicalRates();
    return rates.map(r => {
      // Extract tier from notes prefix (Tier A, Tier B, etc)
      let tier = 'Standard';
      if (r.notes?.startsWith('Tier A:')) tier = 'Tier A (National)';
      else if (r.notes?.startsWith('Tier B:')) tier = 'Tier B (Local)';
      else if (r.notes?.startsWith('Legacy:')) tier = 'Legacy';

      return {
        union: r.union,
        role: r.classification,
        occCode: r.occCode,
        rate: r.amountUsd,
        unit: r.rateType,
        track: r.track,
        tier: tier,
        geographyState: r.geographyState,
        notes: r.notes
      };
    });
  }
};
