import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { GeneralFundTransaction, CustomRole, DEFAULT_CUSTOM_ROLES, DEFAULT_DIVISION_TAGS, DEFAULT_SPECIALTY_TAGS } from "./types";

export function useWorkspaceSettings(isOfflineMock?: boolean) {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    return localStorage.getItem("axotic_logo_url") || "";
  });
  const [workspaceName, setWorkspaceName] = useState<string>(() => {
    return localStorage.getItem("axotic_workspace_name") || "AXOTIC Robotics Hub";
  });
  const [generalFundTransactions, setGeneralFundTransactions] = useState<GeneralFundTransaction[]>([]);
  
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => {
    const direct = localStorage.getItem("axotic_custom_roles");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    if (storedGen) {
      try {
        const p = JSON.parse(storedGen);
        if (p.customRoles && Array.isArray(p.customRoles) && p.customRoles.length > 0) return p.customRoles;
      } catch (_) {}
    }
    return DEFAULT_CUSTOM_ROLES;
  });

  const [divisionTags, setDivisionTags] = useState<string[]>(() => {
    const direct = localStorage.getItem("axotic_division_tags");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    if (storedGen) {
      try {
        const p = JSON.parse(storedGen);
        if (p.divisionTags && Array.isArray(p.divisionTags) && p.divisionTags.length > 0) return p.divisionTags;
      } catch (_) {}
    }
    return DEFAULT_DIVISION_TAGS;
  });

  const [specialtyTags, setSpecialtyTags] = useState<string[]>(() => {
    const direct = localStorage.getItem("axotic_specialty_tags");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const storedGen = localStorage.getItem("axotic_mock_general_settings");
    if (storedGen) {
      try {
        const p = JSON.parse(storedGen);
        if (p.specialtyTags && Array.isArray(p.specialtyTags) && p.specialtyTags.length > 0) return p.specialtyTags;
      } catch (_) {}
    }
    return DEFAULT_SPECIALTY_TAGS;
  });

  useEffect(() => {
    const loadCachedSettings = () => {
      const storedLogo = localStorage.getItem("axotic_logo_url");
      const storedName = localStorage.getItem("axotic_workspace_name");
      if (storedLogo) setLogoUrl(storedLogo === "/AXOTIC Logo-1.png" ? "/logo.png" : storedLogo);
      if (storedName) setWorkspaceName(storedName);

      const directRoles = localStorage.getItem("axotic_custom_roles");
      if (directRoles) {
        try {
          const parsed = JSON.parse(directRoles);
          if (Array.isArray(parsed) && parsed.length > 0) setCustomRoles(parsed);
        } catch (_) {}
      }

      const storedGen = localStorage.getItem("axotic_mock_general_settings");
      if (storedGen) {
        try {
          const p = JSON.parse(storedGen);
          if (p.generalFundTransactions) setGeneralFundTransactions(p.generalFundTransactions);
          if (!directRoles && p.customRoles && Array.isArray(p.customRoles) && p.customRoles.length > 0) {
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

    loadCachedSettings();
    window.addEventListener("axotic_db_update", loadCachedSettings);

    if (!isOfflineMock) {
      const unsub = onSnapshot(doc(db, "settings", "general"), (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl === "/AXOTIC Logo-1.png" ? "/logo.png" : data.logoUrl);
            localStorage.setItem("axotic_logo_url", data.logoUrl);
          }
          if (data.workspaceName) {
            setWorkspaceName(data.workspaceName);
            localStorage.setItem("axotic_workspace_name", data.workspaceName);
          }
          if (data.generalFundTransactions) setGeneralFundTransactions(data.generalFundTransactions);
          if (data.customRoles && Array.isArray(data.customRoles) && data.customRoles.length > 0) {
            setCustomRoles(data.customRoles);
            localStorage.setItem("axotic_custom_roles", JSON.stringify(data.customRoles));
          }
          if (data.divisionTags && Array.isArray(data.divisionTags) && data.divisionTags.length > 0) {
            setDivisionTags(data.divisionTags);
            localStorage.setItem("axotic_division_tags", JSON.stringify(data.divisionTags));
          }
          if (data.specialtyTags && Array.isArray(data.specialtyTags) && data.specialtyTags.length > 0) {
            setSpecialtyTags(data.specialtyTags);
            localStorage.setItem("axotic_specialty_tags", JSON.stringify(data.specialtyTags));
          }
        }
      }, () => {
        // ignoring errors for general settings load explicitly
      });
      return () => {
        window.removeEventListener("axotic_db_update", loadCachedSettings);
        unsub();
      };
    }

    return () => window.removeEventListener("axotic_db_update", loadCachedSettings);
  }, [isOfflineMock]);

  return { logoUrl, workspaceName, generalFundTransactions, customRoles, divisionTags, specialtyTags };
}
