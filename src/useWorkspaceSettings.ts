import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { GeneralFundTransaction } from "./types";

export function useWorkspaceSettings(isOfflineMock?: boolean) {
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState<string>("AXOTIC Robotics Hub");
  const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);

  useEffect(() => {
    if (isOfflineMock) {
      const storedLogo = localStorage.getItem("axotic_logo_url");
      const storedName = localStorage.getItem("axotic_workspace_name");
      if (storedLogo) setLogoUrl(storedLogo);
      if (storedName) setWorkspaceName(storedName);
      const storedGen = localStorage.getItem("axotic_mock_general_settings");
      if (storedGen) {
        try {
          const p = JSON.parse(storedGen);
          if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);
        } catch(e) {}
      }
      
      const handleUpdate = () => {
        const _logo = localStorage.getItem("axotic_logo_url");
        const _name = localStorage.getItem("axotic_workspace_name");
        if (_logo) setLogoUrl(_logo);
        if (_name) setWorkspaceName(_name);
        const _storedGen = localStorage.getItem("axotic_mock_general_settings");
        if (_storedGen) {
          try {
            const p = JSON.parse(_storedGen);
            if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);
          } catch(e) {}
        }
      };
      window.addEventListener("axotic_db_update", handleUpdate);
      return () => window.removeEventListener("axotic_db_update", handleUpdate);
    } else {
      const unsub = onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.workspaceName) setWorkspaceName(data.workspaceName);
          if (data.generalFundTransactions) setGeneralFundTransactions(data.generalFundTransactions);
        }
      }, () => {
        // ignoring errors for general settings load explicitly
      });
      return () => unsub();
    }
  }, [isOfflineMock]);

  return { logoUrl, workspaceName, generalFundTransactions };
}
