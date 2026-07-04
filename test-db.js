import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app);

async function inspectDb() {
  try {
    console.log("--- Users ---");
    const usersSnapshot = await getDocs(collection(db, "users"));
    console.log("Total users:", usersSnapshot.size);
    usersSnapshot.forEach((doc) => {
      console.log(`User ID: ${doc.id}`, JSON.stringify(doc.data(), null, 2));
    });

    console.log("--- Competitions ---");
    const compsSnapshot = await getDocs(collection(db, "competitions"));
    console.log("Total competitions:", compsSnapshot.size);
    compsSnapshot.forEach((doc) => {
      console.log(`Comp ID: ${doc.id}`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (error) {
    console.error("Error inspecting database:", error);
  }
}

inspectDb();
