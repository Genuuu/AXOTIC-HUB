const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

code = code.replace(
  'import { getFirestore, doc, getDocFromServer, addDoc, collection } from "firebase/firestore";',
  'import { getFirestore, initializeFirestore, doc, getDocFromServer, addDoc, collection } from "firebase/firestore";'
);

code = code.replace(
  'export const db = (firebaseConfig as any).firestoreDatabaseId\n  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)\n  : getFirestore(app);',
  'export const db = (firebaseConfig as any).firestoreDatabaseId\n  ? initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId)\n  : initializeFirestore(app, { experimentalForceLongPolling: true });'
);

fs.writeFileSync('src/firebase.ts', code);
