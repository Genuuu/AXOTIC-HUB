import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function useWorkspaceSettings(isOfflineMock?: boolean) {
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState<string>("AXOTIC Robotics Hub");

  useEffect(() => {
    if (isOfflineMock) {
      const storedLogo = localStorage.getItem("axotic_logo_url");
      const storedName = localStorage.getItem("axotic_workspace_name");
      if (storedLogo) setLogoUrl(storedLogo);
      if (storedName) setWorkspaceName(storedName);
      
      const handleUpdate = () => {
        const _logo = localStorage.getItem("axotic_logo_url");
        const _name = localStorage.getItem("axotic_workspace_name");
        if (_logo) setLogoUrl(_logo);
        if (_name) setWorkspaceName(_name);
      };
      window.addEventListener("axotic_db_update", handleUpdate);
      return () => window.removeEventListener("axotic_db_update", handleUpdate);
    } else {
      const unsub = onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.workspaceName) setWorkspaceName(data.workspaceName);
        }
      }, () => {
        // ignoring errors for general settings load explicitly
      });
      return () => unsub();
    }
  }, [isOfflineMock]);

  return { logoUrl, workspaceName };
}
