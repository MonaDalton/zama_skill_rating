import * as fs from "fs";
import * as path from "path";

const violations = [];

function checkFile(filePath, content) {
  const lines = content.split('\n');
  
  // Check for SSR/ISR patterns
  const ssrPatterns = [
    /getServerSideProps/,
    /getStaticProps/,
    /getInitialProps/,
    /serverActions/,
    /'use server'/,
    /"use server"/,
  ];
  
  // Check for API routes
  const apiRoutePattern = /\/api\//;
  
  // Check for server-only imports
  const serverOnlyPattern = /from ['"]server-only['"]/;
  
  // Check for next/headers, cookies(), etc.
  const serverImports = [
    /from ['"]next\/headers['"]/,
    /from ['"]next\/cookies['"]/,
    /cookies\(\)/,
  ];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check SSR patterns
    ssrPatterns.forEach(pattern => {
      if (pattern.test(line) && !line.includes('//') && !line.trim().startsWith('//')) {
        violations.push(`❌ ${filePath}:${lineNum} - Found SSR/ISR pattern: ${line.trim()}`);
      }
    });
    
    // Check API routes
    if (apiRoutePattern.test(filePath)) {
      violations.push(`❌ ${filePath} - API route detected (not allowed for static export)`);
    }
    
    // Check server-only
    if (serverOnlyPattern.test(line)) {
      violations.push(`❌ ${filePath}:${lineNum} - server-only import: ${line.trim()}`);
    }
    
    // Check server imports
    serverImports.forEach(pattern => {
      if (pattern.test(line) && !line.includes('//') && !line.trim().startsWith('//')) {
        violations.push(`❌ ${filePath}:${lineNum} - Server-only import/function: ${line.trim()}`);
      }
    });
  });
  
  // Check for dynamic routes without generateStaticParams
  const dynamicRoutePattern = /\[.*\]/;
  if (dynamicRoutePattern.test(filePath)) {
    const dirPath = path.dirname(filePath);
    const hasGenerateStaticParams = content.includes('generateStaticParams');
    if (!hasGenerateStaticParams) {
      violations.push(`⚠️  ${filePath} - Dynamic route detected but no generateStaticParams found`);
    }
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, out
      if (!['node_modules', '.next', 'out'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
      // Skip check-static.mjs itself
      if (!filePath.includes('check-static.mjs')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Check next.config.ts
const nextConfigPath = path.resolve('./next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const content = fs.readFileSync(nextConfigPath, 'utf-8');
  if (!content.includes("output: 'export'") && !content.includes('output: "export"')) {
    violations.push(`❌ ${nextConfigPath} - Missing output: 'export'`);
  }
}

// Walk through app and pages directories
const appDir = path.resolve('./app');
const pagesDir = path.resolve('./pages');

if (fs.existsSync(appDir)) {
  const files = walkDir(appDir);
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    checkFile(file, content);
  });
}

if (fs.existsSync(pagesDir)) {
  const files = walkDir(pagesDir);
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    checkFile(file, content);
  });
}

// Report results
if (violations.length > 0) {
  console.error('\n===============================================================================\n');
  console.error(' ❌ Static Export Check Failed!\n');
  console.error(' Violations found:\n');
  violations.forEach(v => console.error(`   ${v}`));
  console.error('\n===============================================================================\n');
  process.exit(1);
} else {
  console.log('✅ Static export check passed!');
}



