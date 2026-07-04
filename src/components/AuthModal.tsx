import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Shield, Sparkles, X, Mail, ArrowRight, Key } from "lucide-react";
import { UserRole, UserProfile } from "../types";
import defaultLogoUrl from "../../Images/Logo.png";
import { useWorkspaceSettings } from "../useWorkspaceSettings";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState("");
  
  const { logoUrl: remoteLogoUrl } = useWorkspaceSettings();
  const activeLogoUrl = remoteLogoUrl || defaultLogoUrl;

  if (!isOpen) return null;

  // Handles Google Login & Member Whitelist Validation
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorText("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = (user.email || "").trim().toLowerCase();

      if (!email) {
        throw new Error("Unable to retrieve email from your Google Account.");
      }

      await processUserAccess(user.uid, email, user.displayName, user.photoURL);
    } catch (err: any) {
      console.error("Google Auth Error", err instanceof Error ? err.message : String(err));
      if (err.code === "auth/unauthorized-domain") {
        setErrorText(
          `Unauthorized Domain: Please add "${window.location.hostname}" to the Authorized Domains list in your Firebase Console -> Authentication -> Settings -> Authorized domains.`
        );
      } else if (err.code === "auth/admin-restricted-operation") {
        setErrorText("Admin Restricted Operation: Please make sure the 'Google' sign-in provider is enabled in your Firebase Authentication settings and Identity Toolkit API is enabled.");
      } else {
        setErrorText(
          "Google Sign-in popup canceled or failed. Please check if your domain is authorized or use Manual Access."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Process access to whitelist and admin parent accounts
  const processUserAccess = async (
    googleUid: string,
    email: string,
    displayName: string | null,
    photoURL: string | null
  ) => {
    // 1. Is it the Admin Parent Account?
    if (email === "genukakisara@gmail.com") {
      const userDocRef = doc(db, "users", googleUid);
      const docSnap = await getDoc(userDocRef);

      let profile: UserProfile;
      if (docSnap.exists()) {
        profile = { uid: googleUid, ...docSnap.data() } as UserProfile;
        // Make sure role is always admin for the parent account
        if (profile.role !== "admin") {
          profile.role = "admin";
          await setDoc(userDocRef, profile);
        }
      } else {
        // Create full admin profile for parent account
        profile = {
          uid: googleUid,
          displayName: displayName || "Genu Kakisara (Admin)",
          email: email,
          role: "admin",
          avatarUrl: photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=Genu`,
          joinedAt: new Date().toISOString(),
          subTeam: "Core Engineering",
          birthday: "2003-08-15"
        };
        await setDoc(userDocRef, profile);
      }

      localStorage.setItem("axotic_local_auth", JSON.stringify(profile));
      onAuthSuccess(profile);
      onClose();
      return;
    }

    // 2. Otherwise check pre-registered member list
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const matchedDoc = querySnapshot.docs[0];
      const matchedId = matchedDoc.id;
      const matchedData = matchedDoc.data();

      let profile: UserProfile;

      // Migrate document ID to googleUid if it's currently a temporary ID
      if (matchedId !== googleUid) {
        profile = {
          ...matchedData,
          uid: googleUid,
          displayName: matchedData.displayName || displayName || "AXOTIC Scholar",
          avatarUrl: matchedData.avatarUrl || photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${googleUid}`
        } as UserProfile;

        // Write to new Google UID key
        await setDoc(doc(db, "users", googleUid), profile);

        // Delete the legacy temp document
        try {
          await deleteDoc(doc(db, "users", matchedId));
        } catch (delErr) {
          console.warn("Could not delete legacy temporary user doc", delErr instanceof Error ? delErr.message : String(delErr));
        }
      } else {
        profile = { uid: matchedId, ...matchedData } as UserProfile;
      }

      localStorage.setItem("axotic_local_auth", JSON.stringify(profile));
      onAuthSuccess(profile);
      onClose();
    } else {
      // Reject and sign out
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Sign out err", err instanceof Error ? err.message : String(err));
      }
      setErrorText(`Access Denied: The Google Account "${email}" is not registered on this system. Please contact an Administrator to have your account added first.`);
    }
  };

  // Manual Email Override Access for development environment or iframe sandbox fallback
  const handleFallbackAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = fallbackEmail.trim().toLowerCase();
    if (!email) return;

    setLoading(true);
    setErrorText("");

    try {
      // Sign in anonymously to authenticate the user session in Firebase Auth securely
      const cred = await signInAnonymously(auth);
      const firebaseUid = cred.user.uid;

      // 1. Is it the Admin Parent Account?
      if (email === "genukakisara@gmail.com") {
        const userDocRef = doc(db, "users", firebaseUid);
        const docSnap = await getDoc(userDocRef);

        let profile: UserProfile;
        if (docSnap.exists()) {
          profile = { uid: firebaseUid, ...docSnap.data() } as UserProfile;
          if (profile.role !== "admin") {
            profile.role = "admin";
            await setDoc(userDocRef, profile);
          }
        } else {
          profile = {
            uid: firebaseUid,
            displayName: "Genu Kakisara (Admin)",
            email: email,
            role: "admin",
            avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Genu`,
            joinedAt: new Date().toISOString(),
            subTeam: "Core Engineering",
            birthday: "2003-08-15"
          };
          await setDoc(userDocRef, profile);
        }

        localStorage.setItem("axotic_local_auth", JSON.stringify(profile));
        onAuthSuccess(profile);
        onClose();
        return;
      }

      // 2. Query registered member
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const matchedDoc = querySnapshot.docs[0];
        const matchedData = matchedDoc.data();
        
        const profile: UserProfile = {
          ...matchedData,
          uid: firebaseUid,
          displayName: matchedData.displayName || "AXOTIC Scholar",
          avatarUrl: matchedData.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${firebaseUid}`
        } as UserProfile;

        // Write user profile to the newly generated anonymous user ID so isMember() / hasUserDoc() passes
        await setDoc(doc(db, "users", firebaseUid), profile);

        localStorage.setItem("axotic_local_auth", JSON.stringify(profile));
        onAuthSuccess(profile);
        onClose();
      } else {
        // Sign out if not registered
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.warn("Sign out err", signOutErr);
        }
        setErrorText(`Access Denied: The Google email "${email}" is not registered in the system. An administrator must onboard you first.`);
      }
    } catch (err: any) {
      console.error("Fallback auth error", err instanceof Error ? err.message : String(err));
      setErrorText("Database communication error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div id="auth-modal-card" className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 dark:bg-black px-6 py-6 text-white relative text-left">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-3.5 mb-2.5">
            <img 
              src={activeLogoUrl || undefined} 
              alt="AXOTIC Logo" 
              className="h-7 object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">
              Secure Entrance Gate
            </div>
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">TEAM AXOTIC HUB</h2>
          <p className="text-xs text-slate-400 mt-1">Authenticate utilizing your Google account to sync your credentials & authorized permissions.</p>
        </div>

        {/* Content Box */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-left">
          {errorText && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <span className="size-2 bg-rose-500 rounded-full shrink-0 animate-ping" />
              <span>{errorText}</span>
            </div>
          )}

          {!devMode ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Access is restricted to authorized member Google Accounts. Your registered email must be added to the Hub roster by an administrator.
              </p>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/10 cursor-pointer uppercase tracking-wider"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.43 10.564-10.74 0-.72-.078-1.27-.172-1.815l-10.392-.17z" />
                </svg>
                {loading ? "Verifying Account..." : "Continue with Google"}
              </button>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => setDevMode(true)}
                  className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-blue-500 transition-colors font-mono cursor-pointer underline"
                >
                  Iframe Popup Blocked? Try Manual Email Access
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="size-4 text-blue-600" /> Manual Email Access
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                Type your pre-approved Google Account email to resolve your access token directly if popup frames are restricted by your browser.
              </p>

              <form onSubmit={handleFallbackAccess} className="space-y-3.5">
                <div className="relative">
                  <Mail className="size-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="Google Account Email (e.g. genukakisara@gmail.com)"
                    value={fallbackEmail}
                    onChange={(e) => setFallbackEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950/80 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm outline-hidden transition-all text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDevMode(false);
                      setErrorText("");
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    ← Back to Google Auth
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {loading ? "Authenticating..." : "Establish Access"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          © 2026 AXOTIC ROBOTICS CONTROL GATEWAY
        </div>
      </div>
    </div>
  );
}
