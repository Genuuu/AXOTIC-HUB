import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { GeneralFundTransaction, CustomRole, DEFAULT_CUSTOM_ROLES, DEFAULT_DIVISION_TAGS, DEFAULT_SPECIALTY_TAGS } from "./types";

export function useWorkspaceSettings(isOfflineMock?: boolean) {
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState<string>("AXOTIC Robotics Hub");
  const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(DEFAULT_CUSTOM_ROLES);
  const [divisionTags, setDivisionTags] = useState<string[]>(DEFAULT_DIVISION_TAGS);
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(DEFAULT_SPECIALTY_TAGS);

  useEffect(() => {
    if (isOfflineMock) {
      const storedLogo = localStorage.getItem("axotic_logo_url");
      const storedName = localStorage.getItem("axotic_workspace_name");
      if (storedLogo) setLogoUrl(storedLogo === "/AXOTIC Logo-1.png" ? "/logo.png" : storedLogo);
      if (storedName) setWorkspaceName(storedName);
      const storedGen = localStorage.getItem("axotic_mock_general_settings");
      if (storedGen) {
        try {
          const p = JSON.parse(storedGen);
          if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);
          if (p.customRoles && Array.isArray(p.customRoles) && p.customRoles.length > 0) {
            setCustomRoles(p.customRoles);
          }
          if (p.divisionTags && Array.isArray(p.divisionTags) && p.divisionTags.length > 0) {
            setDivisionTags(p.divisionTags);
          }
          if (p.specialtyTags && Array.isArray(p.specialtyTags) && p.specialtyTags.length > 0) {
            setSpecialtyTags(p.specialtyTags);
          }
        } catch(e) {}
      }
      
      const handleUpdate = () => {
        const _logo = localStorage.getItem("axotic_logo_url");
        const _name = localStorage.getItem("axotic_workspace_name");
        if (_logo) setLogoUrl(_logo === "/AXOTIC Logo-1.png" ? "/logo.png" : _logo);
        if (_name) setWorkspaceName(_name);
        const _storedGen = localStorage.getItem("axotic_mock_general_settings");
        if (_storedGen) {
          try {
            const p = JSON.parse(_storedGen);
            if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);
            if (p.customRoles && Array.isArray(p.customRoles) && p.customRoles.length > 0) {
              setCustomRoles(p.customRoles);
            }
            if (p.divisionTags && Array.isArray(p.divisionTags) && p.divisionTags.length > 0) {
              setDivisionTags(p.divisionTags);
            }
            if (p.specialtyTags && Array.isArray(p.specialtyTags) && p.specialtyTags.length > 0) {
              setSpecialtyTags(p.specialtyTags);
            }
          } catch(e) {}
        }
      };
      window.addEventListener("axotic_db_update", handleUpdate);
      return () => window.removeEventListener("axotic_db_update", handleUpdate);
    } else {
      const unsub = onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data.logoUrl) setLogoUrl(data.logoUrl === "/AXOTIC Logo-1.png" ? "/logo.png" : data.logoUrl);
          if (data.workspaceName) setWorkspaceName(data.workspaceName);
          if (data.generalFundTransactions) setGeneralFundTransactions(data.generalFundTransactions);
          if (data.customRoles && Array.isArray(data.customRoles) && data.customRoles.length > 0) {
            setCustomRoles(data.customRoles);
          }
          if (data.divisionTags && Array.isArray(data.divisionTags) && data.divisionTags.length > 0) {
            setDivisionTags(data.divisionTags);
          }
          if (data.specialtyTags && Array.isArray(data.specialtyTags) && data.specialtyTags.length > 0) {
            setSpecialtyTags(data.specialtyTags);
          }
        }
      }, () => {
        // ignoring errors for general settings load explicitly
      });
      return () => unsub();
    }
  }, [isOfflineMock]);

  return { logoUrl, workspaceName, generalFundTransactions, customRoles, divisionTags, specialtyTags };
}
