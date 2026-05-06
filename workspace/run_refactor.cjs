const fs = require('fs');
const path = require('path');

const agentsDir = path.join(__dirname, 'src', 'lib', 'agents');
const dirs = ['core', 'sourcing', 'finance', 'operations'];

dirs.forEach(d => {
  const p = path.join(agentsDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const move = (oldPath, newPath) => {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${oldPath} -> ${newPath}`);
  }
};

// Moving files
move(path.join(agentsDir, 'breakdown.ts'), path.join(agentsDir, 'core', 'breakdown.ts'));
move(path.join(agentsDir, 'shotList.ts'), path.join(agentsDir, 'core', 'shotList.ts'));
move(path.join(agentsDir, 'audit.ts'), path.join(agentsDir, 'core', 'audit.ts'));

move(path.join(agentsDir, 'schedule.ts'), path.join(agentsDir, 'operations', 'schedule.ts'));
move(path.join(agentsDir, 'callSheet.ts'), path.join(agentsDir, 'operations', 'callSheet.ts'));
move(path.join(agentsDir, 'staffing.ts'), path.join(agentsDir, 'operations', 'staffing.ts'));
move(path.join(agentsDir, 'outreach.ts'), path.join(agentsDir, 'operations', 'outreach.ts'));
move(path.join(agentsDir, 'chat.ts'), path.join(agentsDir, 'operations', 'chat.ts'));
move(path.join(agentsDir, 'producer.ts'), path.join(agentsDir, 'operations', 'producer.ts'));
move(path.join(agentsDir, 'processResponse.ts'), path.join(agentsDir, 'operations', 'processResponse.ts'));

move(path.join(agentsDir, 'sourcing.ts'), path.join(agentsDir, 'sourcing', 'index.ts'));
move(path.join(agentsDir, 'travelLodging.ts'), path.join(agentsDir, 'sourcing', 'travelLodging.ts'));
move(path.join(agentsDir, 'craftServices.ts'), path.join(agentsDir, 'sourcing', 'craftServices.ts'));

move(path.join(agentsDir, 'budget.ts'), path.join(agentsDir, 'finance', 'index.ts'));
move(path.join(agentsDir, 'budgetRecommendation.ts'), path.join(agentsDir, 'finance', 'budgetRecommendation.ts'));
move(path.join(agentsDir, 'taxIncentives.ts'), path.join(agentsDir, 'finance', 'taxIncentives.ts'));

// Creating new index exports
const indexContent = `// Core
export * from './core/breakdown';
export * from './core/shotList';
export * from './core/audit';

// Operations
export * from './operations/schedule';
export * from './operations/callSheet';
export * from './operations/staffing';
export * from './operations/outreach';
export * from './operations/chat';
export * from './operations/producer';
export * from './operations/processResponse';

// Sourcing
export * from './sourcing/index';
export * from './sourcing/travelLodging';
export * from './sourcing/craftServices';

// Finance
export { budget } from './finance/index';
export * from './finance/budgetRecommendation';
export * from './finance/taxIncentives';
`;

fs.writeFileSync(path.join(agentsDir, 'index.ts'), indexContent);
console.log("Updated top-level index.ts");

// Need to fix imports in some operations that reference `../utils` now needing to be `../../utils`
const fixImports = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.ts')) {
      const p = path.join(dir, file);
      let content = fs.readFileSync(p, 'utf-8');
      content = content.replace(/from "\.\.\/utils/g, 'from "../../utils');
      content = content.replace(/from "\.\/utils/g, 'from "../utils');
      fs.writeFileSync(p, content);
    }
  }
}

fixImports(path.join(agentsDir, 'core'));
fixImports(path.join(agentsDir, 'operations'));
fixImports(path.join(agentsDir, 'sourcing'));
fixImports(path.join(agentsDir, 'finance'));
console.log("Fixed relative imports in subdirectories");

