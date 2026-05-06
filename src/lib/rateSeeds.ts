import { CanonicalRate } from '../types';

export const DGA_SEED_RATES: Partial<CanonicalRate>[] = [
  // THEATRICAL - HIGH BUDGET
  { union: 'DGA', occCode: 'DIR_TH_HB', classification: 'Director', rateType: 'week', amountUsd: 23207, scheduleName: 'Theatrical (High Budget)', extractionConfidence: 'high', notes: 'Guaranteed 10 weeks' },
  { union: 'DGA', occCode: 'UPM_TH_HB', classification: 'Unit Production Manager', rateType: 'week', amountUsd: 6719, scheduleName: 'Theatrical (High Budget)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: '1AD_TH_HB', classification: 'First Assistant Director', rateType: 'week', amountUsd: 6388, scheduleName: 'Theatrical (High Budget)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: '2AD_TH_HB', classification: 'Second Assistant Director', rateType: 'week', amountUsd: 4184, scheduleName: 'Theatrical (High Budget)', extractionConfidence: 'high' },
  
  // THEATRICAL - LEVEL 4 ($11M+)
  { union: 'DGA', occCode: 'DIR_TH_L4', classification: 'Director', rateType: 'week', amountUsd: 21100, scheduleName: 'Level 4 ($11,000,000+)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: 'UPM_TH_L4', classification: 'Unit Production Manager', rateType: 'week', amountUsd: 5900, scheduleName: 'Level 4 ($11,000,000+)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: '1AD_TH_L4', classification: 'First Assistant Director', rateType: 'week', amountUsd: 5600, scheduleName: 'Level 4 ($11,000,000+)', extractionConfidence: 'high' },
  
  // THEATRICAL - LEVEL 3 ($5.5M - $11M)
  { union: 'DGA', occCode: 'DIR_TH_L3', classification: 'Director', rateType: 'week', amountUsd: 15825, scheduleName: 'Level 3 ($5.5M - $11M)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: 'UPM_TH_L3', classification: 'Unit Production Manager', rateType: 'week', amountUsd: 5375, scheduleName: 'Level 3 ($5.5M - $11M)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: '1AD_TH_L3', classification: 'First Assistant Director', rateType: 'week', amountUsd: 5100, scheduleName: 'Level 3 ($5.5M - $11M)', extractionConfidence: 'high' },
  
  // THEATRICAL - LEVEL 2 ($2.6M - $5.5M)
  { union: 'DGA', occCode: 'DIR_TH_L2', classification: 'Director', rateType: 'week', amountUsd: 13188, scheduleName: 'Level 2 ($2.6M - $5.5M)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: 'UPM_TH_L2', classification: 'Unit Production Manager', rateType: 'week', amountUsd: 4800, scheduleName: 'Level 2 ($2.6M - $5.5M)', extractionConfidence: 'high' },
  
  // THEATRICAL - LEVEL 1 ($0 - $2.6M)
  { union: 'DGA', occCode: 'DIR_TH_L1', classification: 'Director', rateType: 'week', amountUsd: 11000, scheduleName: 'Level 1 ($0 - $2.6M)', extractionConfidence: 'high' },

  // TV / SVOD (HIGH BUDGET)
  { union: 'DGA', occCode: 'DIR_TV_1H', classification: 'Director (1 Hour)', rateType: 'flat', amountUsd: 54627, scheduleName: 'Network TV (1 Hour)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: 'DIR_TV_30M', classification: 'Director (30 Mins)', rateType: 'flat', amountUsd: 31057, scheduleName: 'Network TV (30 Mins)', extractionConfidence: 'high' },
  { union: 'DGA', occCode: 'UPM_TV_HB', classification: 'Unit Production Manager', rateType: 'week', amountUsd: 6300, scheduleName: 'Network TV (Major)', extractionConfidence: 'high' }
];

export const SAG_SEED_RATES: Partial<CanonicalRate>[] = [
  // THEATRICAL - BASIC AGREEMENT
  { union: 'SAG-AFTRA', occCode: 'DAY_PERF_BA', classification: 'Performer (Day Check)', rateType: 'day', amountUsd: 1158, scheduleName: 'Basic Agreement (Theatrical)', agreementCode: 'BA', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'WEEK_PERF_BA', classification: 'Performer (Weekly)', rateType: 'week', amountUsd: 4019, scheduleName: 'Basic Agreement (Theatrical)', agreementCode: 'BA', extractionConfidence: 'high' },
  
  // LOW BUDGET AGREEMENTS (LBA)
  { union: 'SAG-AFTRA', occCode: 'DAY_PERF_LBA', classification: 'Performer (Day)', rateType: 'day', amountUsd: 720, scheduleName: 'Low Budget Agreement (LBA)', agreementCode: 'LBA', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'WEEK_PERF_LBA', classification: 'Performer (Weekly)', rateType: 'week', amountUsd: 2500, scheduleName: 'Low Budget Agreement (LBA)', agreementCode: 'LBA', extractionConfidence: 'high' },
  
  // MODERATE LOW BUDGET AGREEMENT (MLB)
  { union: 'SAG-AFTRA', occCode: 'DAY_PERF_MLB', classification: 'Performer (Day)', rateType: 'day', amountUsd: 420, scheduleName: 'Moderate Low Budget (MLB)', agreementCode: 'MLB', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'WEEK_PERF_MLB', classification: 'Performer (Weekly)', rateType: 'week', amountUsd: 1450, scheduleName: 'Moderate Low Budget (MLB)', agreementCode: 'MLB', extractionConfidence: 'high' },
  
  // ULTRA LOW BUDGET AGREEMENT (ULA)
  { union: 'SAG-AFTRA', occCode: 'DAY_PERF_ULA', classification: 'Performer (Day)', rateType: 'day', amountUsd: 216, scheduleName: 'Ultra Low Budget (ULA)', agreementCode: 'ULA', extractionConfidence: 'high' },
  
  // SHORT PROJECT AGREEMENT (SPA)
  { union: 'SAG-AFTRA', occCode: 'DAY_PERF_SPA', classification: 'Performer (Day)', rateType: 'day', amountUsd: 125, scheduleName: 'Short Project (SPA)', agreementCode: 'SPA', extractionConfidence: 'high' },

  // BACKGROUND
  { union: 'SAG-AFTRA', occCode: 'BG_GEN', classification: 'General Background', rateType: 'day', amountUsd: 216, scheduleName: 'General (8 hrs)', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'BG_SPEC', classification: 'Special Ability Background', rateType: 'day', amountUsd: 226, scheduleName: 'Special Ability (8 hrs)', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'STANDIN', classification: 'Stand-in / Photo Double', rateType: 'day', amountUsd: 243, scheduleName: 'Stand-in (8 hrs)', extractionConfidence: 'high' },
  
  // TELEVISION
  { union: 'SAG-AFTRA', occCode: 'TV_DAY', classification: 'TV Performer (Day)', rateType: 'day', amountUsd: 1158, scheduleName: 'Television (Major)', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'TV_3DAY', classification: 'TV Performer (3-Day)', rateType: 'flat', amountUsd: 2933, scheduleName: 'Television (3-Day)', extractionConfidence: 'high' },
  { union: 'SAG-AFTRA', occCode: 'TV_WEEK', classification: 'TV Performer (Weekly)', rateType: 'week', amountUsd: 4019, scheduleName: 'Television (Major)', extractionConfidence: 'high' }
];

export const WGA_SEED_RATES: Partial<CanonicalRate>[] = [
  // THEATRICAL
  { union: 'WGA', occCode: 'SCR_ORIG_HB', classification: 'Original Screenplay (High Budget)', rateType: 'flat', amountUsd: 170655, scheduleName: 'Theatrical (> $5M)', extractionConfidence: 'high' },
  { union: 'WGA', occCode: 'SCR_ORIG_LB', classification: 'Original Screenplay (Low Budget)', rateType: 'flat', amountUsd: 90904, scheduleName: 'Theatrical (< $5M)', extractionConfidence: 'high' },
  { union: 'WGA', occCode: 'REWRITE_HB', classification: 'Rewrite (High Budget)', rateType: 'flat', amountUsd: 45470, scheduleName: 'Theatrical (> $5M)', extractionConfidence: 'high' },
  { union: 'WGA', occCode: 'REWRITE_LB', classification: 'Rewrite (Low Budget)', rateType: 'flat', amountUsd: 34106, scheduleName: 'Theatrical (< $5M)', extractionConfidence: 'high' },
  
  // TELEVISION / SVOD
  { union: 'WGA', occCode: 'TV_STORY_30', classification: 'Story (30 Mins)', rateType: 'flat', amountUsd: 11046, scheduleName: 'TV / SVOD', extractionConfidence: 'high' },
  { union: 'WGA', occCode: 'TV_STORY_60', classification: 'Story (60 Mins)', rateType: 'flat', amountUsd: 20101, scheduleName: 'TV / SVOD', extractionConfidence: 'high' },
  { union: 'WGA', occCode: 'TV_TELE_30', classification: 'Teleplay (30 Mins)', rateType: 'flat', amountUsd: 31057, scheduleName: 'TV / SVOD', extractionConfidence: 'high' },
  { union: 'WGA', occCode: 'TV_TELE_60', classification: 'Teleplay (60 Mins)', rateType: 'flat', amountUsd: 54627, scheduleName: 'TV / SVOD', extractionConfidence: 'high' }
];

export const IATSE_SEED_RATES: Partial<CanonicalRate>[] = [
  // LOCAL 800 - ART DIRECTORS GUILD (MAJORS)
  { 
    union: 'IATSE-800', 
    occCode: '800_PD_M', 
    classification: 'Production Designer', 
    rateType: 'week', 
    amountUsd: 4250, 
    scheduleName: 'Feature (Majors)', 
    track: 'Majors',
    extractionConfidence: 'high',
    notes: 'Basic Agreement'
  },
  { 
    union: 'IATSE-800', 
    occCode: '800_AD_M', 
    classification: 'Art Director', 
    rateType: 'week', 
    amountUsd: 3850, 
    scheduleName: 'Feature (Majors)', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  { 
    union: 'IATSE-800', 
    occCode: '800_SD_M', 
    classification: 'Set Designer', 
    rateType: 'week', 
    amountUsd: 2850, 
    scheduleName: 'Feature (Majors)', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  
  // LOCAL 800 - ART DIRECTORS GUILD (INDEPENDENT)
  { 
    union: 'IATSE-800', 
    occCode: '800_PD_I', 
    classification: 'Production Designer', 
    rateType: 'week', 
    amountUsd: 3600, 
    scheduleName: 'Independent Agreement (Tier 2/3)', 
    track: 'Independents',
    extractionConfidence: 'high'
  },
  
  // LOCAL 600 - CINEMATOGRAPHERS (MAJORS)
  { 
    union: 'IATSE-600', 
    occCode: '600_DP_M', 
    classification: 'Director of Photography', 
    rateType: 'week', 
    amountUsd: 5800, 
    scheduleName: 'Feature (Majors)', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  { 
    union: 'IATSE-600', 
    occCode: '600_1AC_M', 
    classification: '1st Assistant Camera', 
    rateType: 'hour', 
    amountUsd: 62.50, 
    scheduleName: 'Basic Agreement', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  // LOCAL 700 - EDITORS (MAJORS)
  { 
    union: 'IATSE-700', 
    occCode: '700_EDIT_M', 
    classification: 'Editor', 
    rateType: 'week', 
    amountUsd: 4150, 
    scheduleName: 'Theatrical Feature', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  { 
    union: 'IATSE-700', 
    occCode: '700_ASE_M', 
    classification: 'Assistant Editor', 
    rateType: 'week', 
    amountUsd: 2250, 
    scheduleName: 'Theatrical Feature', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  // LOCAL 728 - LIGHTING (MAJORS)
  { 
    union: 'IATSE-728', 
    occCode: '728_GAF_M', 
    classification: 'Chief Lighting Technician (Gaffer)', 
    rateType: 'hour', 
    amountUsd: 58.42, 
    scheduleName: 'Basic Agreement', 
    track: 'Majors',
    extractionConfidence: 'high'
  },
  // LOCAL 80 - GRIPS (MAJORS)
  { 
    union: 'IATSE-80', 
    occCode: '80_KEY_M', 
    classification: 'Key Grip', 
    rateType: 'hour', 
    amountUsd: 58.42, 
    scheduleName: 'Basic Agreement', 
    track: 'Majors',
    extractionConfidence: 'high',
    notes: 'National Tier A'
  },
  // TIER B - LOCAL/REGIONAL EXAMPLES
  { 
    union: 'IATSE-476', 
    occCode: '476_GAF_B', 
    classification: 'Gaffer', 
    rateType: 'hour', 
    amountUsd: 48.00, 
    scheduleName: 'Tier B Agreement', 
    track: 'Independents',
    geographyState: 'IL',
    geographyCity: 'Chicago',
    extractionConfidence: 'high',
    notes: 'Regional Tier B'
  },
  // POST PRODUCTION (LOCAL 700)
  { 
    union: 'IATSE-700', 
    occCode: '700_SOUND_A', 
    classification: 'Sound Editor', 
    rateType: 'week', 
    amountUsd: 3850, 
    scheduleName: 'Post Production Agreement', 
    track: 'Majors',
    extractionConfidence: 'high',
    notes: 'Tier A Post'
  },
  { 
    union: 'IATSE-700', 
    occCode: '700_COLOR_A', 
    classification: 'Colorist', 
    rateType: 'week', 
    amountUsd: 4500, 
    scheduleName: 'Post Production Agreement', 
    track: 'Majors',
    extractionConfidence: 'high',
    notes: 'Tier A Post'
  }
];
