const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSettings.tsx', 'utf8');

const newStates = `
  // General Fund / Treasury
  const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);
  const [newFundType, setNewFundType] = useState<"deposit" | "withdrawal">("deposit");
  const [newFundAmount, setNewFundAmount] = useState("");
  const [newFundNotes, setNewFundNotes] = useState("");
`;

code = code.replace(
  '  const [newCategoryName, setNewCategoryName] = useState("");',
  '  const [newCategoryName, setNewCategoryName] = useState("");' + newStates
);

fs.writeFileSync('src/components/AdminSettings.tsx', code);
