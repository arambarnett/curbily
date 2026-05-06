export const UNION_ROLES: Record<string, string[]> = {
  'SAG-AFTRA': [
    'Performer (Day)', 
    'Performer (Weekly)', 
    'Stunt Coordinator', 
    'Stunt Performer', 
    'Background Actor', 
    'Stand-in', 
    'Voiceover', 
    'Singer', 
    'Dancer',
    'Choreographer'
  ],
  'DGA': [
    'Director', 
    'Unit Production Manager', 
    'First Assistant Director', 
    'Second Assistant Director', 
    'Key Second Assistant Director', 
    'Associate Director',
    'Stage Manager'
  ],
  'WGA': [
    'Original Screenplay', 
    'Teleplay', 
    'Story + Teleplay',
    'Rewrite', 
    'Polish',
    'Story Editor', 
    'Executive Story Editor', 
    'Staff Writer'
  ],
  'IATSE': [
    'Director of Photography', 
    'Camera Operator', 
    '1st AC', 
    '2nd AC', 
    'DIT', 
    'Production Designer', 
    'Art Director', 
    'Set Decorator', 
    'Props Master',
    'Gaffer', 
    'Best Boy Electric', 
    'Electrician', 
    'Key Grip', 
    'Best Boy Grip', 
    'Dolly Grip', 
    'Grip',
    'Costume Designer', 
    'Wardrobe Supervisor', 
    'Set Costumer',
    'HMU Artist', 
    'Key Hair', 
    'Key Makeup',
    'Sound Mixer', 
    'Boom Operator', 
    'Sound Utility',
    'Editor', 
    'Assistant Editor', 
    'Script Supervisor'
  ],
  'TEAMSTERS': [
    'Transportation Coordinator', 
    'Transportation Captain', 
    'Driver', 
    'Dispatcher', 
    'Location Manager', 
    'Assistant Location Manager'
  ]
};

export const UNION_OCC_CODES: Record<string, Record<string, string>> = {
  'SAG-AFTRA': {
    'Performer (Day)': 'DAY_PERF',
    'Performer (Weekly)': 'WK_PERF',
    'Background Actor': 'BG_GEN',
    'Stand-in': 'STANDIN'
  },
  'DGA': {
    'Director': 'DIR',
    'Unit Production Manager': 'UPM',
    'First Assistant Director': '1AD',
    'Second Assistant Director': '2AD'
  },
  'WGA': {
    'Original Screenplay': 'SCR_ORIG',
    'Rewrite': 'REWRITE',
    'Polish': 'POLISH'
  }
};

export const ALL_ROLES = Array.from(new Set(Object.values(UNION_ROLES).flat())).sort();
