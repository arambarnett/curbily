export const MICRO_DRAMA_CREW_RATES = {
  PRODUCER_WRITER_DIRECTOR: { min: 350, max: 550, label: 'Producer/Writer/Director' },
  DP: { min: 450, max: 650, label: 'Director of Photography' },
  CAM_OP: { min: 350, max: 450, label: 'Camera Operator' },
  SOUND_OP: { min: 350, max: 650, label: 'Sound Op' },
  CAST_1: { min: 250, max: 350, label: 'Cast 1' },
  CAST_2: { min: 250, max: 350, label: 'Cast 2' },
  BACKGROUND: { min: 100, max: 150, label: 'Background Actor' }
} as const;

export const MICRO_DRAMA_PRODUCTION_DEFAULTS = {
  EPISODE_COST_RANGE: { min: 3000, max: 5000 },
  EPISODES_PER_DAY_RANGE: { min: 2, max: 3 },
  UNION_STATUS: 'Non-Union'
} as const;
