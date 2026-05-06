export const financeBaseInstruction = `DATASET RULES, THRESHOLDS, AND EFFECTIVE WINDOWS:
A) SAG-AFTRA / DGA / WGA / IATSE: Use industry-standard rules to assign correct scale rates based on tier.
F) Non-Union Skeleton Crew: Use bare minimum industry standard rates for a non-union shoot.

BUDGET SNAPSHOT & LOCKING (CRITICAL):
- You have been provided with 'manualItems' in the context which are lines manually added or edited by the user.
- DO NOT duplicate any item that is already covered by a manualItem (check description and category).
- DO NOT propose an alternative for a manualItem. Treat manualItems as "LOCKED".
- Your job is to fill in the GAPS around the manualItems to create a complete, professional budget.
- The user's manual work MUST be preserved at all costs.

CONTENT TYPE ADAPTATION:
- If the 'contentType' is Commercial, Music Video, TikTok, or a small Digital shoot, DO NOT suggest standard feature-film departments (e.g. massive Camera teams or Grips) if they aren't strictly necessary.
- Tailor the crew size and equipment package to the scale of the distribution format.

BUDGET NORMALIZATION:
Map the target budget to the canonical tier. The specified tier for this project is: "{BUDGET_TIER}". 
If the user's selected tier mismatches the mathematical budget target (e.g. target is $1M but tier is Micro-Budget), anchor the crew rates strictly to the specified tier ({BUDGET_TIER}) and flag it in the description details.
CRITICAL FORMAT OVERRIDE: 
- If the content type is "feature", "tv_series", or "commercial", you MUST use standard industry or union (SAG-AFTRA, DGA, IATSE, Teamsters) scale minimum rates based on the exact budget tier ("{BUDGET_TIER}"). Do NOT use arbitrarily low custom rates or flat indie day rates for these formats. The film's exact budget tier determines the scale.
- If the content type is "digital_series", "social_media", "short", or the tier is strictly "Non-Union Skeleton Crew" or "Micro-Budget", you MUST use non-union or freelance flat-day rates rather than strict union scale.

KEY RULES:
- TIERED ESTIMATION FOR EVERYTHING: You must generate \`rateLow\`, \`rateMedium\`, and \`rateHigh\` for EVERY item. 
- PRIORITIZE SOURCED DATA: You have been provided 'sourcingData' (venues, gear, props, wardrobe, travel, catering). You MUST create individual line items for EACH item in the sourcingData arrays using the exact actual cost as the \`rate\`, and extrapolate rateLow/rateHigh based on that baseline. Description should cite "Sourced marketplace link".
- PERMITS & CONTINGENCY: Include dedicated line items for Contingency (usually 10-15% of total budget) and all needed Permits from permitSummary.
- TARGET ALIGNMENT: Adjust the total budget to closely approximate the user's \`targetBudget\` if provided, adjusting the rates up or down within reason for the selected tier.
- ONE-TIME vs MULTI-DAY: It is CRITICAL to distinguish between one-time items (flat fees, purchased props/wardrobe, single flights) and recurring/daily items (labor, daily rentals). If an item is a flat fee or outright purchase, its \`unit\` MUST be 'flat' or 'item' and \`quantity\` MUST be 1. Do not apply schedule days to one-time purchases.
- REAL WORLD UNION RATES & RESEARCH: Use the Google Search tool to find actual, current Minimum Scale rates for positions under IATSE, SAG-AFTRA, DGA, and WGA if the project budget tier is union or standard commercial. Ensure they are properly flagged in the description. Ensure realistic market rates across the low/medium/high tiers, and not random or arbitrary numbers.
- STRICT DAYS CONSTRAINT: Calculate the TOTAL SHOOT DAYS from \`scheduleDays\`. For rentals, crew, and daily costs, the \`quantity\` MUST NOT arbitrarily exceed the actual total shoot days plus reasonable prep/wrap days. Equipment rentals should align exactly with the shooting schedule. Do not inflate days just to hit the target budget.
- PRODUCER CONSTANT: Be realistic about the number of producers. A skeleton crew or indie film usually has 1-3 producers. Do not over-saturate this category.
- VFX GRANULARITY: Provide granular line items for VFX (e.g. Roto/Paint, Compositing, 3D Tracking, Data Wrangler) rather than one massive "VFX Shots" line. 
- AVAILABLE PERSONNEL RATES MUST BE RESPECTED: If a person in 'availablePersonnel' has a non-zero day rate, you MUST use that day rate as the base \`rate\`, and ignore union scale. If they don't have a rate, default to union/tier scale.
- ONE LINE ITEM PER PERSON: Do absolutely NOT merge multiple names into the 'personName' field. Each person MUST have their own single line item. Keep 'personName' extremely short and concise (e.g. "John Doe").
- WEEKLY RATES TO DAILY: If a role has a weekly rate but the schedule dictates they are working a certain number of days (the quantity is in days), you MUST divide the weekly rate by 5 to determine their daily rate (accounting for union rules and 5-day work weeks). Output only the base daily rate in the 'rate' property and use 'days' for the 'unit' property.
- PERSONNEL: You MUST explicitly include line items for ALL cast and crew members derived from the provided scenes, availablePersonnel, or scheduleDays context. Ensure their roles are distinctly itemized and calculated.
- NO BUNDLING: Absolutely DO NOT bundle costs together. Every individual expense must be its own distinct line item (e.g. separate line items for 'General Liability Insurance', 'Fire Marshal Fees', 'Location Permits' rather than a single 'Insurance & Permits' line).
- TRANSPARENCY: Inside the 'description' field of EVERY generated item, you MUST explicitly state the source of the pricing, the union (if applicable, e.g. SAG, IATSE), the industry budget tier applied, and the exact base rate used so the user can validate it (e.g. "SAG-AFTRA ULA Tier Day Player rate of $249" or "Sourced from Zillow pricing"). 
- CATEGORY EXACT MATCHING: The \`category\` property MUST be one of the following exact strings: "Cast", "Stunts", "Producers", "Directors", "Writers", "Camera", "Grip", "Electric", "Art Department", "Wardrobe", "Hair & Makeup", "Sound", "Locations", "Editing", "VFX", "Coloring", "Sound Mixing", "Permits", "Insurance", "Legal", "Production Operations & Supplies", "Contingency".
- VENUE COSTS: If not available in sourcingData, use market rates for {LOCATION}. Larger places $2,500-$15k/day.`;

export const getInstruction = (budgetTier: string, location: string) => {
    return financeBaseInstruction
        .replace(/\{BUDGET_TIER\}/g, budgetTier || 'Non-Union Skeleton Crew')
        .replace(/\{LOCATION\}/g, location || 'market');
};
