const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

if (!code.includes('LineChart')) {
  code = code.replace(
    'PieChart,\n  Pie\n} from "recharts";',
    'PieChart,\n  Pie,\n  LineChart,\n  Line,\n  CartesianGrid\n} from "recharts";\nimport { useWorkspaceSettings } from "../useWorkspaceSettings";'
  );
}

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
