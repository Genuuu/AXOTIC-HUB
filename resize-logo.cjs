const fs = require('fs');

// 1. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /className=\{`\$\{isSidebarCollapsed \? "h-10 w-10 justify-center" : "h-10 md:h-12 w-auto justify-start max-w-\[200px\]"\} rounded-lg overflow-hidden flex items-center relative shrink-0 transition-all`\}/,
  'className={`\\${isSidebarCollapsed ? "h-10 w-10 justify-center" : "h-14 md:h-16 w-auto justify-start max-w-[240px]"} rounded-lg overflow-hidden flex items-center relative shrink-0 transition-all`}'
);
fs.writeFileSync('src/App.tsx', app);

// 2. PublicLanding.tsx
let pub = fs.readFileSync('src/components/PublicLanding.tsx', 'utf8');
pub = pub.replace(
  /className="h-10 sm:h-12 lg:h-14 w-auto max-w-\[200px\] sm:max-w-\[250px\] object-contain drop-shadow-sm transition-all"/,
  'className="h-14 sm:h-16 md:h-20 w-auto max-w-[60vw] sm:max-w-[300px] md:max-w-[400px] object-contain drop-shadow-sm transition-all"'
);
fs.writeFileSync('src/components/PublicLanding.tsx', pub);

// 3. AuthModal.tsx
let auth = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
auth = auth.replace(
  /className="h-8 md:h-10 w-auto object-contain transition-all"/,
  'className="h-12 md:h-16 w-auto max-w-[70vw] object-contain transition-all"'
);
fs.writeFileSync('src/components/AuthModal.tsx', auth);
