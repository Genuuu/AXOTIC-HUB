const fs = require('fs');
const lines = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.trim() === 'return (');
console.log(start);
