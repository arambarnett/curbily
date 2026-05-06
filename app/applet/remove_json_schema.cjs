const fs = require('fs');

const files = [
  "src/lib/agents/processResponse.ts",
  "src/lib/agents/shotList.ts",
  "src/lib/agents/sourcing.ts",
  "src/lib/agents/breakdown.ts",
  "src/lib/agents/travelLodging.ts",
  "src/lib/agents/budgetRecommendation.ts",
  "src/lib/agents/outreach.ts",
  "src/lib/agents/schedule.ts",
  "src/lib/agents/chat.ts",
  "src/lib/agents/callSheet.ts",
  "src/lib/agents/craftServices.ts",
  "src/lib/agents/staffing.ts",
  "src/lib/agents/producer.ts",
  "src/lib/agents/budget.ts",
  "src/lib/agents/taxIncentives.ts",
  "src/lib/agents/audit.ts"
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Remove responseMimeType
    content = content.replace(/\s*responseMimeType:\s*["']application\/json["'],?/g, '');
    
    // Remove responseSchema completely, which can span multiple lines
    // This is tricky because it's a JSON object. We can use a regex or just replace the known ones.
    // Let's use a bracket matching approach.
    while (content.includes('responseSchema:')) {
      const idx = content.indexOf('responseSchema:');
      let startIdx = content.indexOf('{', idx);
      if (startIdx === -1) {
          // Maybe it's a variable reference?
          const endIdx = content.indexOf(',', idx);
          content = content.slice(0, Math.max(0, content.lastIndexOf(', ', idx))) + content.slice(endIdx !== -1 ? endIdx + 1 : idx);
          break;
      }
      let brackets = 1;
      let endIdx = startIdx + 1;
      while (brackets > 0 && endIdx < content.length) {
        if (content[endIdx] === '{') brackets++;
        else if (content[endIdx] === '}') brackets--;
        endIdx++;
      }
      // include trailing comma if exists
      if (content[endIdx] === ',') endIdx++;
      
      // Also remove any preceding comma and newline before responseSchema
      let prevLines = idx;
      while (prevLines > 0 && /\s/.test(content[prevLines-1])) prevLines--;
      if (content[prevLines-1] === ',') prevLines--;
      
      content = content.slice(0, prevLines) + content.slice(endIdx);
    }

    fs.writeFileSync(file, content);
    console.log("Cleaned structured output from", file);
  }
}
