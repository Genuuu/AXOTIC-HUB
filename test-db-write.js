import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app);

async function inspectDb() {
  try {
    const data = { users: [], competitions: [] };
    
    const usersSnapshot = await getDocs(collection(db, "users"));
    usersSnapshot.forEach((doc) => {
      data.users.push({ id: doc.id, ...doc.data() });
    });

    try {
      const compsSnapshot = await getDocs(collection(db, "competitions"));
      compsSnapshot.forEach((doc) => {
        data.competitions.push({ id: doc.id, ...doc.data() });
      });
    } catch (e) {
      data.competitionsError = e.message || String(e);
    }

    fs.writeFileSync("./db-inspect.json", JSON.stringify(data, null, 2));
    console.log("Written inspection data to db-inspect.json");
    process.exit(0);
  } catch (error) {
    console.error("Error inspecting database:", error);
    process.exit(1);
  }
}

inspectDb();
