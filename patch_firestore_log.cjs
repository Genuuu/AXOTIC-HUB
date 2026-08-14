const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

code = code.replace(
  'import { getFirestore, initializeFirestore, doc, getDocFromServer, addDoc, collection } from "firebase/firestore";',
  'import { getFirestore, initializeFirestore, doc, getDocFromServer, addDoc, collection, setLogLevel } from "firebase/firestore";\nsetLogLevel("silent");'
);

fs.writeFileSync('src/firebase.ts', code);
