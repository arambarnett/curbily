import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const initialContent = content;

  // Replace `return () => setTimeout(() => unsub(), 500);`
  content = content.replace(/return \(\) => setTimeout\(\(\) => ([a-zA-Z0-9_]+)\(\), 500\);/g, 'return () => $1();');
  
  // Replace `return () => setTimeout(() => { try { unsub() } catch(e){} }, 500);`
  content = content.replace(/return \(\) => setTimeout\(\(\) => \{\s*try\s*\{\s*([a-zA-Z0-9_]+)\(\)\s*\}\s*catch\(e\)\{\}\s*\}, 500\);/g, 'return () => $1();');

  // Replace block form:
  // return () => { setTimeout(() => { ... }, 500); }
  // to: return () => { ... }
  content = content.replace(/return \(\) => \{\s*setTimeout\(\(\) => \{\s*try\s*\{([\s\S]*?)\}\s*catch\(e\)\{\}\s*\}, 500\);\s*\};/g, 'return () => {$1};');

  content = content.replace(/return \(\) => \{\s*setTimeout\(\(\) => \{([\s\S]*?)\}, 500\);\s*\};/g, 'return () => {$1};');

  if (content !== initialContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
}
