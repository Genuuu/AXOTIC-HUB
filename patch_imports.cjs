const fs = require('fs');
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

code = code.replace(
  '  PieChart,\n  Pie\n} from "recharts";',
  '  PieChart,\n  Pie,\n  LineChart,\n  Line,\n  CartesianGrid\n} from "recharts";\nimport { useWorkspaceSettings } from "../useWorkspaceSettings";'
);

code = code.replace(
  '  const [competitions, setCompetitions] = useState<Competition[]>([]);',
  '  const [competitions, setCompetitions] = useState<Competition[]>([]);\n  const { generalFundTransactions } = useWorkspaceSettings(currentUser.isOfflineMock);'
);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
