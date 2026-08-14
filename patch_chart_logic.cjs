const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

const chartLogic = `
  const fundChartData = useMemo(() => {
    if (!generalFundTransactions || generalFundTransactions.length === 0) return [];
    
    // Sort transactions by date ascending
    const sorted = [...generalFundTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // First, find the starting balance before the 30-day window
    let runningBalance = 0;
    
    for (const tx of sorted) {
      if (new Date(tx.date).getTime() < thirtyDaysAgo.getTime()) {
        runningBalance += (tx.type === "deposit" ? tx.amount : -tx.amount);
      }
    }
    
    // Generate an entry for each of the last 30 days
    const data = [];
    let currentDay = new Date(thirtyDaysAgo);
    
    while (currentDay <= now) {
      const dayStart = new Date(currentDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDay);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTx = sorted.filter(tx => {
        const txDate = new Date(tx.date).getTime();
        return txDate >= dayStart.getTime() && txDate <= dayEnd.getTime();
      });
      
      const dayChange = dayTx.reduce((sum, tx) => sum + (tx.type === "deposit" ? tx.amount : -tx.amount), 0);
      runningBalance += dayChange;
      
      data.push({
        date: currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: runningBalance,
      });
      
      currentDay = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000);
    }
    
    return data;
  }, [generalFundTransactions]);
`;

code = code.replace(
  'const ongoingProjects = projectsList.filter(p => p.status !== "Finished");',
  chartLogic + '\\n  const ongoingProjects = projectsList.filter(p => p.status !== "Finished");'
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
