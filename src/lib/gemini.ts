export * from './agents';

// Aliases for backward compatibility during transition
import { 
  breakdown as breakdownAgent,
  schedule as scheduleAgent,
  budget as budgetAgent,
  sourcing,
  travelLodging as travelAgent,
  callSheet as callSheetAgent,
  craftServices as craftServicesAgent,
  chat as chatAgent,
  processResponse as processResponseAgent,
  shotList as shotListAgent,
  budgetRecommendation as budgetRecommendationAgent,
  outreach as outreachAgent,
  crewRecommendations as crewRecommendationsAgent,
  producer as producerAgent,
  generateScriptFromIdea as scriptAgent
} from './agents';

export {
  breakdownAgent,
  scheduleAgent,
  budgetAgent,
  sourcing,
  travelAgent,
  callSheetAgent,
  craftServicesAgent,
  chatAgent,
  processResponseAgent,
  shotListAgent,
  budgetRecommendationAgent,
  outreachAgent,
  crewRecommendationsAgent,
  producerAgent,
  scriptAgent
};
