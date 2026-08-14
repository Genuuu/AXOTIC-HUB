const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

const chartUI = `
          {/* GENERAL FUND BALANCE TREND CHART */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="size-4 text-emerald-600 animate-pulse" />
              Treasury Balance (30 Days)
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all text-center flex flex-col justify-between min-h-[280px]">
              {fundChartData.length === 0 ? (
                <div className="my-auto py-8 px-4 flex flex-col items-center justify-center space-y-3">
                  <div className="size-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                    <TrendingUp className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-700">No Treasury Data</h4>
                    <p className="text-[10.5px] text-slate-400 max-w-xs leading-relaxed">
                      Transactions need to be logged to visualize the general fund trend.
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={fundChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      dy={10}
                      minTickGap={20}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(value) => \`\${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}\`}
                    />
                    <ChartTooltip 
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => [\`LKR \${Number(value).toLocaleString()}\`, 'Balance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#059669" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
`;

code = code.replace(
  '{/* VISUAL COMPONENT USAGE ANALYTICS CHART */}',
  chartUI + '\\n          {/* VISUAL COMPONENT USAGE ANALYTICS CHART */}'
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
