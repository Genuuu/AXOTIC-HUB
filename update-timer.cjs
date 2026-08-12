const fs = require('fs');
let code = fs.readFileSync('src/components/CountdownTimer.tsx', 'utf8');

const finishedStatus = `  if (status === "finished") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 font-mono bg-amber-50 dark:bg-amber-900/20 py-2 px-3 rounded-xl border border-amber-200 dark:border-amber-800/80">
        <Clock className="size-3.5 text-amber-500" />
        <span className="font-bold">Competition Finished</span>
      </div>
    );
  }
  if (status === "postponed") {`;

code = code.replace('  if (status === "postponed") {', finishedStatus);

fs.writeFileSync('src/components/CountdownTimer.tsx', code);
console.log("Updated CountdownTimer");
