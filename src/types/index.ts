export interface Rating {
  id: string;
  projectId: string;
  raterId: string;
  recipientId: string;
  score: number;
  comment?: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: 'producer' | 'admin' | 'user';
  viewMode?: 'producer' | 'talent';
  isSubscribed?: boolean;
  subscriptionId?: string;
  stripeCustomerId?: string;
  subscription?: string;
  projectsCreated?: number;
  freeProjectLimit?: number;
  tokens?: number;
  onboarded?: boolean;
  createdAt?: string;
}

export interface SourcingOption {
  store: 'Amazon' | 'Target' | 'Walmart' | 'Temu' | 'Alibaba' | 'Peerspace' | 'Airbnb' | 'Direct';
  price: number;
  url: string;
  deliveryType?: 'Delivery' | 'Local Pickup';
}

export interface PropItem {
  id: string;
  projectId: string;
  name: string;
  description: string;
  source: 'owned' | 'rental' | 'purchase' | 'build';
  cost: number;
  status: 'needed' | 'sourced' | 'acquired';
  isApproved?: boolean;
  isPurchased?: boolean;
  taskRabbitStatus?: 'none' | 'requested' | 'assigned' | 'completed';
  purchaseUrl?: string;
  affiliateLink?: string;
  options?: SourcingOption[];
  phone?: string;
}

export interface WardrobeItem {
  id: string;
  projectId: string;
  character: string;
  description: string;
  source: 'owned' | 'rental' | 'purchase' | 'build';
  cost: number;
  status: 'needed' | 'sourced' | 'acquired';
  isApproved?: boolean;
  isPurchased?: boolean;
  taskRabbitStatus?: 'none' | 'requested' | 'assigned' | 'completed';
  purchaseUrl?: string;
  affiliateLink?: string;
  options?: SourcingOption[];
  phone?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  placeId?: string;
  isBase?: boolean;
  isApproved?: boolean;
  requiresPermit?: boolean;
  permitStatus?: 'needed' | 'applied' | 'approved' | 'denied';
  phone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PermitContact {
  entity: string;
  location: string;
  url: string;
  phone?: string;
  email?: string;
}

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  status: 'development' | 'pre-production' | 'production' | 'wrap' | 'post-production';
  totalBudget: number;
  spentBudget: number;
  paymentStatus: 'unfunded' | 'funded' | 'disbursing' | 'completed';
  createdAt: any;
  updatedAt: any;
}

export interface AgentStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: any;
  error?: string;
  isApproved?: boolean;
  version?: number; // Related to script version
}

export interface Project {
  id: string;
  title: string;
  description: string;
  folderId?: string;
  status: 'pitching' | 'development' | 'pre-production' | 'production' | 'wrap' | 'post-production' | 'completed';
  spentBudget?: number;
  totalBudget?: number;
  paymentStatus?: 'unfunded' | 'active' | 'disbursing' | 'completed';
  ownerId: string;
  creatorId?: string;
  personnel?: any[];
  publicAccess?: 'none' | 'view' | 'edit';
  sharedEmails?: string[];
  createdAt: any;
  updatedAt: any;
  scriptText?: string;
  scriptUrl?: string;
  targetBudget?: number;
  location?: string; // Main location name
  zipCode?: string;
  useContingency?: boolean;
  contingencyRate?: number; // e.g., 0.1 for 10%
  budgetTier?: 'Ultra Low' | 'Moderate Low' | 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Major Studio' | 'Short Film' | 'New Media' | 'Micro-Budget' | 'Non-Union Skeleton Crew' | 'Low Budget';
  locations?: Location[]; // Multiple locations support
  isSAG?: boolean;
  version?: number;
  contentType?: 'feature' | 'short' | 'episodic' | 'commercial' | 'new_media' | 'documentary' | 'music_video' | 'corporate' | 'micro_drama' | 'other';
  isPerEpisode?: boolean;
  episodeCount?: number;
  totalEpisodes?: number;
  isMicroDrama?: boolean;
  agentInstructions?: string;
  storyboardUrl?: string;
  permitContacts?: PermitContact[];
  permitSummary?: string;
  budgetStatus?: 'draft' | 'under_review' | 'approved';
  budgetApprovedAt?: any;
  budgetApprovedBy?: string;
  budgetNotes?: string;
  budgetScenarios?: {
    low: any[];
    medium: any[];
    high: any[];
  };
  isPaid?: boolean;
  synopsis?: string;
  logline?: string;
  idea?: string;
  agentStatuses?: {
    breakdown?: AgentStatus;
    shotlist?: AgentStatus;
    schedule?: AgentStatus;
    budget?: AgentStatus;
    sourcing?: AgentStatus;
    outreach?: AgentStatus;
    callsheets?: AgentStatus;
  };
  autoRunMaster?: boolean;
  isExecuting?: boolean;
}

export interface ScriptVersion {
  id: string;
  projectId: string;
  scriptText: string;
  scriptUrl?: string;
  createdAt: any;
  versionNumber: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: any;
  tabContext?: string;
}

export interface Shot {
  id: string;
  projectId: string;
  sceneId: string;
  sceneNumber?: number;
  shotNumber: string;
  description: string;
  size: string; // CU, MS, WS, etc.
  angle: string;
  movement: string;
  equipment: string;
}

export interface GearItem {
  id: string;
  projectId: string;
  name: string;
  category: string;
  source: 'owned' | 'rental' | 'purchase';
  vendorId?: string;
  cost: number;
  status: 'needed' | 'sourced' | 'booked' | 'on-set';
  isApproved?: boolean;
  isPurchased?: boolean;
  taskRabbitStatus?: 'none' | 'requested' | 'assigned' | 'completed';
  purchaseUrl?: string;
  phone?: string;
}

export interface OutreachMessage {
  id: string;
  threadId: string;
  role: 'sender' | 'receiver';
  content: string;
  createdAt: any;
}

export interface OutreachThread {
  id: string;
  projectId: string;
  contactId: string;
  role: string;
  status: 'draft' | 'sent' | 'negotiating' | 'confirmed' | 'declined' | 'awaiting_bid' | 'bid_received';
  lastMessage?: string;
  draftEmail?: string;
  aiSummary?: string;
  nextStep?: string;
  automationEnabled?: boolean;
  budgetItemId?: string;
  requestedRate?: number;
  ownerId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Venue {
  id: string;
  projectId: string;
  name: string;
  address: string;
  cost: number;
  status: 'research' | 'contacted' | 'scouted' | 'booked';
  notes: string;
  rateHr?: number;
  rateDay?: number;
  isApproved?: boolean;
  platform?: 'airbnb' | 'peerspace' | 'direct';
  platformId?: string;
  purchaseUrl?: string;
  phone?: string;
  email?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  slugline: string;
  location: string;
  timeOfDay: 'DAY' | 'NIGHT' | 'MORNING' | 'EVENING';
  setting: 'INT' | 'EXT';
  cast: string[];
  props: string[];
  muHair?: string[];
  costume?: string[];
  wardrobe?: string[];
  setdress?: string[];
  sfx?: string[];
  weapons?: string[];
  camera?: string[];
  sound?: string[];
  ge?: string[];
  stunts: string[];
  picVeh?: string[];
  vfx?: string[];
  additionalEquipment?: string[];
  additionalLabor?: string[];
  misc?: string[];
  equipment: string[];
  notes: string;
  synopsis?: string;
  duration?: number; // in minutes
  pageCount?: number;
  pagesEighths?: string;
}

export const PROJECT_TYPES = [
  { id: 'feature', label: 'Feature Film' },
  { id: 'short', label: 'Short Film' },
  { id: 'episodic', label: 'Episodic / TV Series' },
  { id: 'commercial', label: 'Commercial / Branded' },
  { id: 'new_media', label: 'New Media / Digital' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'music_video', label: 'Music Video' },
  { id: 'corporate', label: 'Corporate / Educational' },
  { id: 'micro_drama', label: 'Micro Drama (Vertical)' }
] as const;

export interface Episode {
  id: string;
  projectId: string;
  episodeNumber: number;
  title: string;
  synopsis: string;
  scriptUrl?: string;
  scriptText?: string;
  status: 'idea' | 'scripted' | 'shooting' | 'editing' | 'ready';
  scheduledDate?: any;
  budget?: number;
}

export interface ProjectTypeRate {
  type: Project['contentType'];
  rate?: number;
  minRate?: number;
  maxRate?: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  type: ('cast' | 'crew' | 'vendor' | 'producer')[];
  rate?: number;
  minRate?: number;
  maxRate?: number;
  projectTypeRates?: ProjectTypeRate[];
  location: string;
  canTravel?: string;
  dietary?: string;
  vouchedBy?: string;
  tags: string[];
  notes: string;
  reliability: number; // 1-5
  isGlobal?: boolean;
  ownerId?: string;
  union?: string;
  occCode?: string;
  portfolioUrl?: string;
  headshotUrl?: string;
  bio?: string;
  // Cast specific
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  actingReelUrl?: string;
  // Crew specific
  equipmentList?: string;
  imdbUrl?: string;
  // Vendor specific
  companyName?: string;
  website?: string;
  services?: string;
  socials?: { platform: string, url: string }[];
  isSAG?: boolean;
  isMinor?: boolean;
  age?: number;
  gender?: string;
  contentStyles?: string[];
  // Adult Content specific
  isAdultContentActor?: boolean;
  adultContentDetails?: string;
  onscreenCapabilities?: string[];
  // Invitation fields
  uid?: string;
  inviteCode?: string;
  inviteSentAt?: any;
  claimed?: boolean;
}

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  personName?: string;
  characterName?: string;
  details?: string;
  contactId?: string;
  rate?: number;
  rateLow?: number;
  rateMedium?: number;
  rateHigh?: number;
  selectedTier?: 'low' | 'medium' | 'high';
  quantity?: number;
  tier?: string;
  sourcingLink?: string;
  hourlyRate?: number;
  dayRate?: number;
  amount: number;
  status: 'estimated' | 'actual' | 'paid' | 'manual';
  unit?: 'flat' | 'hourly' | 'daily' | 'weekly';
  union?: string;
  contract?: string;
  occCode?: string;
  history?: {
    date: any;
    oldAmount: number;
    newAmount: number;
    note: string;
  }[];
}

export interface Integration {
  id: string;
  projectId: string;
  platform: 'airbnb' | 'uber' | 'taskrabbit' | 'google-sheets' | 'amazon' | 'temu' | 'walmart' | 'alibaba' | 'quickbooks';
  status: 'connected' | 'disconnected';
  accountName?: string;
  lastSync?: any;
}

export interface AppNotification {
  id: string;
  projectId: string;
  type: 'booking' | 'approval' | 'response' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: any;
}

export interface ScheduleDay {
  id: string;
  projectId: string;
  dayNumber: number;
  date?: string;
  sceneIds: string[];
  sceneNumbers?: number[];
  notes: string;
  rationale?: string;
  dayLength?: number; // hours
  setupTime?: number; // hours (e.g. 0.25)
  wrapTime?: number; // hours (e.g. 0.25)
  travelTime?: number; // hours (e.g. 0.25)
  sceneTimes?: Record<string, number>; // sceneId -> duration in hours
  sidesOverview?: string; // Summary of sides for the day
  breakdownTime?: number; // deprecated, use wrapTime
}

export interface TravelLogistics {
  id: string;
  projectId: string;
  type: 'flight' | 'hotel' | 'car-rental';
  description: string;
  status: 'needed' | 'booked' | 'completed';
  cost: number;
  details: string;
  purchaseUrl?: string;
  phone?: string;
}

export interface CateringOption {
  id: string;
  projectId: string;
  name: string;
  type: 'catering' | 'delivery' | 'crafty';
  costPerPerson: number;
  status: 'research' | 'booked';
  contactInfo: string;
  purchaseUrl?: string;
  phone?: string;
}

export interface CallSheet {
  id: string;
  projectId: string;
  dayId: string;
  date: string;
  callTime: string;
  wrapTime: string;
  location: string;
  weather?: string;
  weatherImpact?: string;
  nearestHospital?: string;
  parkingInfo?: string;
  notes?: string;
  catering?: string;
  shotSchedule?: string;
  timeline?: {
    time: string;
    activity: string;
    involved: string;
  }[];
  status: 'draft' | 'sent';
  sentAt?: any;
  recipients?: string[]; // list of emails
  crew?: {
    id: string;
    name: string;
    role: string;
    callTime: string;
    phone: string;
    email: string;
    department?: string;
    isConfirmed?: boolean;
  }[];
  cast?: {
    id: string;
    name: string;
    character: string;
    callTime: string;
    hairMakeupTime: string;
    onSetTime: string;
    phone: string;
    isConfirmed?: boolean;
  }[];
}

export interface PaymentMethod {
  id: string;
  projectId: string;
  type: 'card';
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  autonomousPurchasingEnabled: boolean;
}

export interface UnionRate {
  id: string;
  union: 'SAG-AFTRA' | 'DGA' | 'WGA' | 'IATSE' | 'TEAMSTERS';
  contract: string; // e.g., "Theatrical Tier 1", "Short Film", "New Media"
  tier: 'Head' | 'Key' | 'Second' | 'Third' | 'Utility';
  role: string; // e.g., "Actor", "Director", "DP", "PA"
  rate: number;
  minRate?: number;
  maxRate?: number;
  unit: 'hour' | 'day' | 'week' | 'flat';
  period?: string; // e.g., "2025-2026"
  contentType?: Project['contentType'];
  notes?: string;
}

export interface CanonicalRate {
  id: string;
  union: string;
  agreementCode?: string;
  track?: 'Majors' | 'Independents' | 'Basic' | 'Other';
  scheduleNumber?: string;
  scheduleName?: string;
  occCode: string;
  classification: string;
  rateType: 'hour' | 'day' | 'week' | 'flat' | 'step';
  amountUsd: number;
  effectiveStart: any; // Date
  effectiveEnd: any; // Date
  geographyState?: string;
  geographyCity?: string;
  localUnion?: string;
  sourceFile: string;
  sourcePdfUrl?: string;
  extractionConfidence: 'high' | 'medium' | 'low';
  notes?: string;
  metadata?: Record<string, any>;
}

export interface DimPosition {
  id: string;
  occCode: string;
  classification: string;
  aliases: string[];
  union?: string;
}

export interface DimLocalMap {
  id: string;
  state: string;
  city: string;
  likelyLocals: string[];
  agreementFamily?: string;
}

export interface DimSchedule {
  id: string;
  union: string;
  agreementCode: string;
  scheduleName: string;
  eligibilityNotes?: string;
  datasetCreatedAt: any;
  sourceEffectiveStart: any;
  sourceEffectiveEnd: any;
  extractedByScript: string;
}
