import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, addDoc, collection } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
  
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider(); // Added the provider here

export async function createGlobalNotification(
  type: "idea_created" | "project_created" | "comment_added",
  message: string,
  linkId: string,
  currentUser: any
) {
  if (currentUser.isOfflineMock) {
    const local = localStorage.getItem("axotic_mock_notifications");
    let currentNotifs: any[] = local ? JSON.parse(local) : [];
    const newNotif = {
      id: `mock-notif-${Date.now()}`,
      message,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: new Date().toISOString(),
      type,
      linkId,
      readBy: []
    };
    localStorage.setItem("axotic_mock_notifications", JSON.stringify([newNotif, ...currentNotifs]));
    window.dispatchEvent(new Event("axotic_db_update"));
    return;
  }
  
  try {
    await addDoc(collection(db, "notifications"), {
      message,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: new Date().toISOString(),
      type,
      linkId,
      readBy: []
    });
  } catch (err) {
    console.warn("Could not create notification", err instanceof Error ? err.message : String(err));
  }
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
        displayName: provider.displayName,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Action Error Logged:", errInfo);
}

export async function testConnectionObj() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Connection Status: OK");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firestore reports client is offline - continuing locally.");
    }
  }
}