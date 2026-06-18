import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  createGlobalNotification
} from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDoc,
  setDoc
} from "firebase/firestore";
import { 
  FolderPlus, 
  Calendar, 
  User, 
  Users, 
  ExternalLink, 
  Trash2, 
  AlertTriangle, 
  Plus, 
  Lock, 
  NotebookPen,
  FileCheck,
  Atom,
  Clock,
  Briefcase,
  X,
  Check,
  ArrowLeft,
  FileText,
  Coins,
  Search,
  Printer,
  Download
} from "lucide-react";
import { Project, ProjectStatus, UserProfile, ProjectLog, AllocatedHardware, InventoryItem, BudgetItem, SponsorFunding, MemberContribution, PeerTransfer } from "../types";

interface ProjectHubProps {
  currentUser: UserProfile;
  roster: UserProfile[];
  initialSelectedProjectId?: string | null;
  onClearInitialSelectedProjectId?: () => void;
}

export default function ProjectHub({ currentUser, roster, initialSelectedProjectId, onClearInitialSelectedProjectId }: ProjectHubProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTab, setProjectTab] = useState<"ongoing" | "finished">("ongoing");
  const [searchQuery, setSearchQuery] = useState("");

  // Handle deep-linked selections from other components (like Home Tab)
  useEffect(() => {
    if (initialSelectedProjectId && projects.length > 0) {
      const match = projects.find(p => p.id === initialSelectedProjectId);
      if (match) {
        setSelectedProject(match);
        if (match.status === "Finished") {
          setProjectTab("finished");
        } else {
          setProjectTab("ongoing");
        }
        if (onClearInitialSelectedProjectId) {
          onClearInitialSelectedProjectId();
        }
      }
    }
  }, [initialSelectedProjectId, projects, onClearInitialSelectedProjectId]);
  
  // Real-time states for the selected project workspace
  const [projectLogs, setProjectLogs] = useState<ProjectLog[]>([]);
  const [allocatedHardware, setAllocatedHardware] = useState<AllocatedHardware[]>([]);
  
  // Create Project Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLeaderId, setNewLeaderId] = useState("");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [newDeadline, setNewDeadline] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newEstimatedCost, setNewEstimatedCost] = useState("");
  const [newCostSplitType, setNewCostSplitType] = useState<"equal" | "custom">("equal");
  const [newMemberCostSplits, setNewMemberCostSplits] = useState<Record<string, number>>({});

  // Edit Project Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLeaderId, setEditLeaderId] = useState("");
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [editDeadline, setEditDeadline] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editEstimatedCost, setEditEstimatedCost] = useState("");
  const [editCostSplitType, setEditCostSplitType] = useState<"equal" | "custom">("equal");
  const [editMemberCostSplits, setEditMemberCostSplits] = useState<Record<string, number>>({});
  
  // Workspace interactions state
  const [newLogContent, setNewLogContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  
  // Dedicated sub-views tab state for selected project workspace
  const [workspaceTab, setWorkspaceTab] = useState<"budget" | "subsystems" | "logs">("budget");
  
  // New budget ledger item scratch states
  const [newBItemName, setNewBItemName] = useState("");
  const [newBItemUnitCost, setNewBItemUnitCost] = useState("");
  const [newBItemQuantity, setNewBItemQuantity] = useState("1");
  const [newBItemPaidById, setNewBItemPaidById] = useState("");

  // New sponsor funding scratch states
  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorAmount, setNewSponsorAmount] = useState("");
  const [newSponsorNotes, setNewSponsorNotes] = useState("");

  // New member contributions scratch states
  const [newContribMemberId, setNewContribMemberId] = useState("");
  const [newContribAmount, setNewContribAmount] = useState("");
  const [newContribNotes, setNewContribNotes] = useState("");
  const [newContribType, setNewContribType] = useState<"reimbursable" | "donation">("reimbursable");
  
  // New peer to peer transfer scratch states
  const [newTransferFromMemberId, setNewTransferFromMemberId] = useState("");
  const [newTransferToMemberId, setNewTransferToMemberId] = useState("");
  const [newTransferAmount, setNewTransferAmount] = useState("");
  const [newTransferNotes, setNewTransferNotes] = useState("");
  
  // State for print and document format generation
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Custom non-blocking popups for iframe preservation
  const [deleteConfirmProjId, setDeleteConfirmProjId] = useState<string | null>(null);

  const isAdmin = currentUser.role === "admin";

  // Bulk action states
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [bulkActionSuccess, setBulkActionSuccess] = useState<string | null>(null);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    if (bulkActionSuccess || bulkActionError) {
      const t = setTimeout(() => {
        setBulkActionSuccess(null);
        setBulkActionError(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [bulkActionSuccess, bulkActionError]);

  const handleToggleSelectProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleBulkStatusUpdate = async (status: ProjectStatus) => {
    if (selectedProjectIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkActionSuccess(null);
    setBulkActionError(null);

    const eligibleProjects = projects.filter(p => selectedProjectIds.includes(p.id) && canModifyProject(p));
    const unauthorizedCount = selectedProjectIds.length - eligibleProjects.length;

    if (eligibleProjects.length === 0) {
      setBulkActionError("None of the selected projects can be modified under your current permissions.");
      setIsBulkProcessing(false);
      return;
    }

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        try {
          const items: Project[] = JSON.parse(stored);
          let updatedCount = 0;
          const updatedItems = items.map(p => {
            if (selectedProjectIds.includes(p.id) && canModifyProject(p)) {
              updatedCount++;
              return {
                ...p,
                status,
                updatedAt: new Date().toISOString()
              };
            }
            return p;
          });
          localStorage.setItem("axotic_mock_projects", JSON.stringify(updatedItems));
          window.dispatchEvent(new Event("axotic_db_update"));
          
          let msg = `Successfully updated status to "${status}" for ${updatedCount} ${updatedCount === 1 ? "project" : "projects"}.`;
          if (unauthorizedCount > 0) {
            msg += ` (${unauthorizedCount} bypassed due to permissions)`;
          }
          setBulkActionSuccess(msg);
          setSelectedProjectIds([]);
        } catch (_) {
          setBulkActionError("An error occurred during local bulk update.");
        }
      }
      setIsBulkProcessing(false);
      return;
    }

    // Live mode bulk status updates
    try {
      let updatedCount = 0;
      await Promise.all(
        eligibleProjects.map(async (p) => {
          const projectRef = doc(db, "projects", p.id);
          await updateDoc(projectRef, {
            status,
            updatedAt: new Date().toISOString()
          });
          try {
            await addDoc(collection(db, "projects", p.id, "logs"), {
              projectId: p.id,
              content: `BULK ACTION: Project status updated to "${status}" via Bulk Control panel by ${currentUser.displayName}.`,
              authorId: currentUser.uid,
              authorName: currentUser.displayName,
              createdAt: new Date().toISOString()
            });
          } catch (_) {
            // Logs write is non-blocking to bulk update itself
          }
          updatedCount++;
        })
      );

      let msg = `Successfully updated status to "${status}" for ${updatedCount} ${updatedCount === 1 ? "project" : "projects"}.`;
      if (unauthorizedCount > 0) {
        msg += ` (${unauthorizedCount} skipped due to permissions)`;
      }
      setBulkActionSuccess(msg);
      setSelectedProjectIds([]);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      setBulkActionError("Failed to perform bulk status update. Verify your permissions.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedProjs = projects.filter(p => selectedProjectIds.includes(p.id));
    const canDeleteAll = isAdmin || selectedProjs.every(p => p.createdBy === currentUser.uid);
    
    if (!canDeleteAll) {
      setBulkActionError("You can only delete projects that you created, or you need administrator privileges.");
      return;
    }
    if (selectedProjectIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkActionSuccess(null);
    setBulkActionError(null);

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        try {
          const items: Project[] = JSON.parse(stored);
          const filtered = items.filter(p => !selectedProjectIds.includes(p.id));
          localStorage.setItem("axotic_mock_projects", JSON.stringify(filtered));
          
          selectedProjectIds.forEach(projId => {
            localStorage.removeItem(`axotic_mock_logs_${projId}`);
            localStorage.removeItem(`axotic_mock_hardware_${projId}`);
          });

          window.dispatchEvent(new Event("axotic_db_update"));
          
          if (selectedProject && selectedProjectIds.includes(selectedProject.id)) {
            setSelectedProject(null);
          }

          setBulkActionSuccess(`Successfully deleted ${selectedProjectIds.length} projects.`);
          setSelectedProjectIds([]);
        } catch (_) {
          setBulkActionError("An error occurred during local bulk deletion.");
        }
      }
      setIsBulkProcessing(false);
      return;
    }

    // Live mode bulk deletion
    try {
      let deletedCount = 0;
      await Promise.all(
        selectedProjectIds.map(async (projectId) => {
          await deleteDoc(doc(db, "projects", projectId));
          deletedCount++;
        })
      );

      if (selectedProject && selectedProjectIds.includes(selectedProject.id)) {
        setSelectedProject(null);
      }

      setBulkActionSuccess(`Successfully deleted ${deletedCount} projects.`);
      setSelectedProjectIds([]);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      setBulkActionError("Failed to complete bulk deletion. Verify administrator privileges.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Stream general stockroom inventory in ProjectHub for inline allocations
  const [allItemsList, setAllItemsList] = useState<InventoryItem[]>([]);
  
  // Hardware modal / allocation states
  const [showAddHardwareModal, setShowAddHardwareModal] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("");
  const [allocationQty, setAllocationQty] = useState(1);
  const [submittingHw, setSubmittingHw] = useState(false);

  const [showRemoveHwModal, setShowRemoveHwModal] = useState(false);
  const [clickedHwItem, setClickedHwItem] = useState<AllocatedHardware | null>(null);
  const [removeQty, setRemoveQty] = useState(1);

  // Stream active projects
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadLocalProjects = () => {
        const stored = localStorage.getItem("axotic_mock_projects");
        if (stored) {
          try {
            const items = JSON.parse(stored);
            setProjects(items);
            if (selectedProject) {
              const updated = items.find((p: Project) => p.id === selectedProject.id);
              if (updated) setSelectedProject(updated);
            }
          } catch (_) {}
        }
      };
      loadLocalProjects();
      window.addEventListener("axotic_db_update", loadLocalProjects);
      return () => window.removeEventListener("axotic_db_update", loadLocalProjects);
    }

    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Project[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Project);
      });
      setProjects(items);
      
      // Keep selected project details synchronized
      if (selectedProject) {
        const updated = items.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "projects");
    });
    return () => unsubscribe();
  }, [selectedProject?.id, currentUser?.isOfflineMock]);

  // Stream logs and hardware of selected project
  useEffect(() => {
    if (!selectedProject) return;

    if (currentUser.isOfflineMock) {
      const loadLocalLogsAndHw = () => {
        const logsKey = `axotic_mock_logs_${selectedProject.id}`;
        const storedLogs = localStorage.getItem(logsKey);
        if (storedLogs) {
          try {
            setProjectLogs(JSON.parse(storedLogs));
          } catch (_) {
            setProjectLogs([]);
          }
        } else {
          // Default initial progress logs seed
          const defaultLogs: ProjectLog[] = [
            {
              id: `mock-log-1-${selectedProject.id}`,
              projectId: selectedProject.id,
              content: "Completed initial subsystem schematic planning. All essential microcontrollers mapped safely.",
              authorId: "mock-genu",
              authorName: "Genu Kakisara (Lead)",
              createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
            }
          ];
          localStorage.setItem(logsKey, JSON.stringify(defaultLogs));
          setProjectLogs(defaultLogs);
        }

        const hwKey = `axotic_mock_hardware_${selectedProject.id}`;
        const storedHw = localStorage.getItem(hwKey);
        if (storedHw) {
          try {
            setAllocatedHardware(JSON.parse(storedHw));
          } catch (_) {
            setAllocatedHardware([]);
          }
        } else {
          setAllocatedHardware([]);
        }
      };

      loadLocalLogsAndHw();
      window.addEventListener("axotic_db_update", loadLocalLogsAndHw);
      return () => window.removeEventListener("axotic_db_update", loadLocalLogsAndHw);
    }

    // Subcollection: logs
    const logsQuery = query(collection(db, "projects", selectedProject.id, "logs"), orderBy("createdAt", "desc"));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsList: ProjectLog[] = [];
      snapshot.forEach((docSnap) => {
        logsList.push({ id: docSnap.id, ...docSnap.data() } as ProjectLog);
      });
      setProjectLogs(logsList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `projects/${selectedProject.id}/logs`);
    });

    // Subcollection: hardware
    const hwQuery = query(collection(db, "projects", selectedProject.id, "hardware"), orderBy("allocatedAt", "desc"));
    const unsubHw = onSnapshot(hwQuery, (snapshot) => {
      const hwList: AllocatedHardware[] = [];
      snapshot.forEach((docSnap) => {
        hwList.push({ id: docSnap.id, ...docSnap.data() } as AllocatedHardware);
      });
      setAllocatedHardware(hwList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `projects/${selectedProject.id}/hardware`);
    });

    return () => {
      unsubLogs();
      unsubHw();
    };
  }, [selectedProject?.id, currentUser?.isOfflineMock]);

  // Stream general stockroom inventory in ProjectHub for inline allocations
  useEffect(() => {
    if (!selectedProject) return;
    
    if (currentUser.isOfflineMock) {
      const loadLocalInventory = () => {
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          try {
            setAllItemsList(JSON.parse(stored));
          } catch (_) {
            setAllItemsList([]);
          }
        }
      };
      loadLocalInventory();
      window.addEventListener("axotic_db_update", loadLocalInventory);
      return () => window.removeEventListener("axotic_db_update", loadLocalInventory);
    }

    const q = query(collection(db, "inventory"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as InventoryItem);
      });
      setAllItemsList(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "inventory");
    });
    return () => unsubscribe();
  }, [selectedProject?.id, currentUser?.isOfflineMock]);

  const handleAllocateHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedInventoryItemId || allocationQty <= 0) return;

    const chosenItem = allItemsList.find(item => item.id === selectedInventoryItemId);
    if (!chosenItem) return;

    if (allocationQty > chosenItem.availableQuantity) {
      alert(`Insufficient stock. Only ${chosenItem.availableQuantity} available in central stockroom.`);
      return;
    }

    if (currentUser.isOfflineMock) {
      try {
        setSubmittingHw(true);
        // 1. Deduct count in Inventory
        const storedInv = localStorage.getItem("axotic_mock_inventory");
        if (storedInv) {
          const invList: InventoryItem[] = JSON.parse(storedInv);
          const iIdx = invList.findIndex(item => item.id === chosenItem.id);
          if (iIdx !== -1) {
            invList[iIdx].availableQuantity = invList[iIdx].availableQuantity - allocationQty;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
          }
        }

        // 2. Append to project allocated hardware subcollection
        const hwKey = `axotic_mock_hardware_${selectedProject.id}`;
        const storedHw = localStorage.getItem(hwKey);
        const hwList: AllocatedHardware[] = storedHw ? JSON.parse(storedHw) : [];
        const hwIdx = hwList.findIndex(hw => hw.id === chosenItem.id);

        if (hwIdx !== -1) {
          hwList[hwIdx].quantity = hwList[hwIdx].quantity + allocationQty;
          hwList[hwIdx].allocatedAt = new Date().toISOString();
        } else {
          const payload: AllocatedHardware = {
            id: chosenItem.id,
            name: chosenItem.name,
            category: chosenItem.category,
            quantity: allocationQty,
            allocatedBy: currentUser.uid,
            allocatedByName: currentUser.displayName,
            allocatedAt: new Date().toISOString()
          };
          hwList.push(payload);
        }
        localStorage.setItem(hwKey, JSON.stringify(hwList));

        // 3. Log
        const logsKey = `axotic_mock_logs_${selectedProject.id}`;
        const storedLogs = localStorage.getItem(logsKey);
        const logsList: ProjectLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog: ProjectLog = {
          id: `mock-log-${Date.now()}`,
          projectId: selectedProject.id,
          content: `ALLOCATION: Allocated x${allocationQty} ${chosenItem.name} onto build substrate directly from project workspace.`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };
        logsList.unshift(newLog);
        localStorage.setItem(logsKey, JSON.stringify(logsList));

        window.dispatchEvent(new Event("axotic_db_update"));

        setShowAddHardwareModal(false);
        setSelectedInventoryItemId("");
        setAllocationQty(1);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmittingHw(false);
      }
      return;
    }

    // Live mode
    try {
      setSubmittingHw(true);
      const inventoryRef = doc(db, "inventory", chosenItem.id);
      await updateDoc(inventoryRef, {
        availableQuantity: chosenItem.availableQuantity - allocationQty
      });

      const projectHwRef = doc(db, "projects", selectedProject.id, "hardware", chosenItem.id);
      const docSnap = await getDoc(projectHwRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        await updateDoc(projectHwRef, {
          quantity: existingData.quantity + allocationQty,
          allocatedAt: new Date().toISOString()
        });
      } else {
        const payload: AllocatedHardware = {
          id: chosenItem.id,
          name: chosenItem.name,
          category: chosenItem.category,
          quantity: allocationQty,
          allocatedBy: currentUser.uid,
          allocatedByName: currentUser.displayName,
          allocatedAt: new Date().toISOString()
        };
        await setDoc(projectHwRef, payload);
      }

      await addDoc(collection(db, "projects", selectedProject.id, "logs"), {
        projectId: selectedProject.id,
        content: `ALLOCATION: Allocated x${allocationQty} ${chosenItem.name} onto build substrate directly from project workspace.`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      setShowAddHardwareModal(false);
      setSelectedInventoryItemId("");
      setAllocationQty(1);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${selectedProject.id}/hardware`);
    } finally {
      setSubmittingHw(false);
    }
  };

  const handlePerformDeallocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !clickedHwItem || removeQty <= 0) return;

    if (removeQty > clickedHwItem.quantity) {
      alert("Cannot remove more components than currently allocated.");
      return;
    }

    if (currentUser.isOfflineMock) {
      try {
        setSubmittingHw(true);

        // 1. Feed count back to Inventory
        const storedInv = localStorage.getItem("axotic_mock_inventory");
        if (storedInv) {
          const invList: InventoryItem[] = JSON.parse(storedInv);
          const iIdx = invList.findIndex(item => item.id === clickedHwItem.id);
          if (iIdx !== -1) {
            invList[iIdx].availableQuantity = invList[iIdx].availableQuantity + removeQty;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
          }
        }

        // 2. Reduce or strip subcollection project-hardware records
        const hwKey = `axotic_mock_hardware_${selectedProject.id}`;
        const storedHw = localStorage.getItem(hwKey);
        if (storedHw) {
          let hwList: AllocatedHardware[] = JSON.parse(storedHw);
          const hwIdx = hwList.findIndex(hw => hw.id === clickedHwItem.id);
          if (hwIdx !== -1) {
            if (removeQty === clickedHwItem.quantity) {
              hwList = hwList.filter(hw => hw.id !== clickedHwItem.id);
            } else {
              hwList[hwIdx].quantity = hwList[hwIdx].quantity - removeQty;
            }
            localStorage.setItem(hwKey, JSON.stringify(hwList));
          }
        }

        // 3. Progress Log
        const logsKey = `axotic_mock_logs_${selectedProject.id}`;
        const storedLogs = localStorage.getItem(logsKey);
        const logsList: ProjectLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog: ProjectLog = {
          id: `mock-log-${Date.now()}`,
          projectId: selectedProject.id,
          content: `REMOVE: Returned x${removeQty} ${clickedHwItem.name} components back to stockroom directly from project workspace.`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };
        logsList.unshift(newLog);
        localStorage.setItem(logsKey, JSON.stringify(logsList));

        window.dispatchEvent(new Event("axotic_db_update"));

        setShowRemoveHwModal(false);
        setClickedHwItem(null);
        setRemoveQty(1);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmittingHw(false);
      }
      return;
    }

    // Live mode
    try {
      setSubmittingHw(true);

      const itemInventoryRef = doc(db, "inventory", clickedHwItem.id);
      const invSnap = await getDoc(itemInventoryRef);
      if (invSnap.exists()) {
        const currentInv = invSnap.data() as InventoryItem;
        await updateDoc(itemInventoryRef, {
          availableQuantity: currentInv.availableQuantity + removeQty
        });
      }

      const projectHwRef = doc(db, "projects", selectedProject.id, "hardware", clickedHwItem.id);
      if (removeQty === clickedHwItem.quantity) {
        await deleteDoc(projectHwRef);
      } else {
        await updateDoc(projectHwRef, {
          quantity: clickedHwItem.quantity - removeQty
        });
      }

      await addDoc(collection(db, "projects", selectedProject.id, "logs"), {
        projectId: selectedProject.id,
        content: `REMOVE: Returned x${removeQty} ${clickedHwItem.name} components back to stockroom directly from project workspace.`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      setShowRemoveHwModal(false);
      setClickedHwItem(null);
      setRemoveQty(1);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${selectedProject.id}/hardware`);
    } finally {
      setSubmittingHw(false);
    }
  };

  const handleDeallocateClick = (hw: AllocatedHardware) => {
    setClickedHwItem(hw);
    setRemoveQty(1);
    setShowRemoveHwModal(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Project Title is required.");
      return;
    }
    if (!newDesc.trim()) {
      setCreateError("Technical Scope Description is required.");
      return;
    }

    const leaderObj = roster.find((u) => u.uid === newLeaderId) || currentUser;
    const taggedMembers = roster.filter((u) => newMemberIds.includes(u.uid));

    const timestamp = new Date().toISOString();
    const payload: Omit<Project, "id"> = {
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: "Planning",
      leaderId: leaderObj.uid,
      leaderName: leaderObj.displayName,
      memberIds: taggedMembers.map(m => m.uid),
      memberNames: taggedMembers.map(m => m.displayName),
      deadline: newDeadline || "",
      startDate: newStartDate || "",
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: currentUser.uid,
      kicadLink: "",
      budget: parseFloat(newBudget) || 0,
      estimatedCost: parseFloat(newEstimatedCost) || 0,
      costSplitType: newCostSplitType,
      memberCostSplits: newMemberCostSplits,
      budgetItems: [],
      sponsorFundings: [],
      memberContributions: [],
      peerTransfers: []
    };

    const clearCreateForm = () => {
      setNewTitle("");
      setNewDesc("");
      setNewLeaderId("");
      setNewMemberIds([]);
      setNewDeadline("");
      setNewStartDate("");
      setNewBudget("");
      setNewEstimatedCost("");
      setNewCostSplitType("equal");
      setNewMemberCostSplits({});
      setCreateError("");
    };

    if (currentUser.isOfflineMock) {
      setLoading(true);
      const stored = localStorage.getItem("axotic_mock_projects");
      const currentProjects: Project[] = stored ? JSON.parse(stored) : [];
      const newProjId = `mock-proj-${Date.now()}`;
      const newProj: Project = {
        id: newProjId,
        ...payload
      };
      localStorage.setItem("axotic_mock_projects", JSON.stringify([newProj, ...currentProjects]));
      window.dispatchEvent(new Event("axotic_db_update"));
      createGlobalNotification("project_created", `New project spawned: ${newProj.title}`, newProjId, currentUser);

      setShowCreateModal(false);
      clearCreateForm();
      setLoading(false);
      return;
    }

    try {
      setCreateError("");
      setLoading(true);
      const docRef = await addDoc(collection(db, "projects"), payload);
      createGlobalNotification("project_created", `New project spawned: ${payload.title}`, docRef.id, currentUser);
      setShowCreateModal(false);
      clearCreateForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "projects");
      setCreateError("Action Failed. A database policy constraint prevented this modification.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: ProjectStatus) => {
    if (!selectedProject) return;

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const idx = items.findIndex(p => p.id === selectedProject.id);
        if (idx !== -1) {
          items[idx].status = status;
          items[idx].updatedAt = new Date().toISOString();
          localStorage.setItem("axotic_mock_projects", JSON.stringify(items));
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
      return;
    }

    const projectRef = doc(db, "projects", selectedProject.id);
    try {
      await updateDoc(projectRef, { 
        status, 
        updatedAt: new Date().toISOString() 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const openEditModal = (p: Project) => {
    setEditTitle(p.title);
    setEditDesc(p.description);
    setEditLeaderId(p.leaderId);
    setEditMemberIds(p.memberIds || []);
    setEditDeadline(p.deadline || "");
    setEditStartDate(p.startDate || "");
    setEditBudget(p.budget !== undefined ? String(p.budget) : "");
    setEditEstimatedCost(p.estimatedCost !== undefined ? String(p.estimatedCost) : "");
    setEditCostSplitType(p.costSplitType || "equal");
    setEditMemberCostSplits(p.memberCostSplits || {});
    setShowEditModal(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editTitle.trim()) return;

    const leaderObj = roster.find((u) => u.uid === editLeaderId) || { uid: selectedProject.leaderId, displayName: selectedProject.leaderName };
    const taggedMembers = roster.filter((u) => editMemberIds.includes(u.uid));

    const timestamp = new Date().toISOString();
    const payloadFields = {
      title: editTitle.trim(),
      description: editDesc.trim(),
      leaderId: leaderObj.uid,
      leaderName: leaderObj.displayName,
      memberIds: taggedMembers.map(m => m.uid),
      memberNames: taggedMembers.map(m => m.displayName),
      deadline: editDeadline || "",
      startDate: editStartDate || "",
      updatedAt: timestamp,
      budget: parseFloat(editBudget) || 0,
      estimatedCost: parseFloat(editEstimatedCost) || 0,
      costSplitType: editCostSplitType,
      memberCostSplits: editMemberCostSplits
    };

    if (currentUser.isOfflineMock) {
      setLoading(true);
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const idx = items.findIndex(p => p.id === selectedProject.id);
        if (idx !== -1) {
          const updatedProj = {
            ...items[idx],
            ...payloadFields
          };
          items[idx] = updatedProj;
          localStorage.setItem("axotic_mock_projects", JSON.stringify(items));
          window.dispatchEvent(new Event("axotic_db_update"));
          setSelectedProject(updatedProj);
        }
      }
      setShowEditModal(false);
      setLoading(false);
      return;
    }

    const projectRef = doc(db, "projects", selectedProject.id);
    try {
      setLoading(true);
      await updateDoc(projectRef, payloadFields);
      setShowEditModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newLogContent.trim()) return;

    const newLog: Omit<ProjectLog, "id"> = {
      projectId: selectedProject.id,
      content: newLogContent.trim(),
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      createdAt: new Date().toISOString()
    };

    if (currentUser.isOfflineMock) {
      const logsKey = `axotic_mock_logs_${selectedProject.id}`;
      const stored = localStorage.getItem(logsKey);
      const currentLogs: ProjectLog[] = stored ? JSON.parse(stored) : [];
      const newLogWithId: ProjectLog = {
        id: `mock-log-${Date.now()}`,
        ...newLog
      };
      localStorage.setItem(logsKey, JSON.stringify([newLogWithId, ...currentLogs]));
      window.dispatchEvent(new Event("axotic_db_update"));
      setNewLogContent("");
      return;
    }

    try {
      await addDoc(collection(db, "projects", selectedProject.id, "logs"), newLog);
      setNewLogContent("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${selectedProject.id}/logs`);
    }
  };

  const handleDeleteProject = (projId: string) => {
    setDeleteConfirmProjId(projId);
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteConfirmProjId) return;
    const projId = deleteConfirmProjId;
    setDeleteConfirmProjId(null);

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const filtered = items.filter(p => p.id !== projId);
        localStorage.setItem("axotic_mock_projects", JSON.stringify(filtered));
        localStorage.removeItem(`axotic_mock_logs_${projId}`);
        localStorage.removeItem(`axotic_mock_hardware_${projId}`);
        window.dispatchEvent(new Event("axotic_db_update"));
        if (selectedProject?.id === projId) {
          setSelectedProject(null);
        }
      }
      return;
    }

    try {
      await deleteDoc(doc(db, "projects", projId));
      if (selectedProject?.id === projId) {
        setSelectedProject(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${projId}`);
    }
  };

  // Check mutation access (Admins have master access; Members can edit if assigned or if they are the original creator)
  const canModifyProject = (p: Project) => {
    if (isAdmin) return true;
    if (p.status === "Finished") return false; // terminal lock for standard members
    return p.createdBy === currentUser.uid || p.leaderId === currentUser.uid || p.memberIds.includes(currentUser.uid);
  };

  const getStatusStyle = (status: ProjectStatus) => {
    switch (status) {
      case "Planning": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Fabricating": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Testing": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Finished": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Continuous": return "bg-sky-50 text-sky-700 border-sky-200 animate-pulse";
    }
  };

  const ongoingProjects = projects.filter((p) => p.status !== "Finished");
  const finishedProjects = projects.filter((p) => p.status === "Finished");
  const filteredProjects = (projectTab === "ongoing" ? ongoingProjects : finishedProjects).filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper algorithm to clear debts and calculate exact settlement steps
  const computeSettlementTransactions = (
    participants: string[],
    spentByMember: Record<string, number>,
    fairShares: Record<string, number>,
    getParticipantName: (uid: string) => string
  ) => {
    const balances = participants.map((uid) => ({
      uid,
      name: getParticipantName(uid),
      balance: (spentByMember[uid] || 0) - (fairShares[uid] || 0),
    }));

    const creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ ...b }));
    const debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ ...b, balance: -b.balance }));

    const transactions: { from: string; to: string; amount: number }[] = [];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const amount = Math.min(creditor.balance, debtor.balance);
      if (amount > 0.01) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount,
        });
      }

      creditor.balance -= amount;
      debtor.balance -= amount;

      if (creditor.balance < 0.01) {
        cIdx++;
      }
      if (debtor.balance < 0.01) {
        dIdx++;
      }
    }

    return transactions;
  };

  const handleUpdateBudgetItems = async (updatedItems: BudgetItem[]) => {
    if (!selectedProject) return;

    // Calculate total cost
    const totalCost = updatedItems.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);

    const payloadFields = {
      budgetItems: updatedItems,
      estimatedCost: totalCost, // update estimatedCost automatically for project health graphs compatibility
      updatedAt: new Date().toISOString()
    };

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const idx = items.findIndex(p => p.id === selectedProject.id);
        if (idx !== -1) {
          const updatedProj = {
            ...items[idx],
            ...payloadFields
          };
          items[idx] = updatedProj;
          localStorage.setItem("axotic_mock_projects", JSON.stringify(items));
          window.dispatchEvent(new Event("axotic_db_update"));
          setSelectedProject(updatedProj);
        }
      }
      return;
    }

    const projectRef = doc(db, "projects", selectedProject.id);
    try {
      await updateDoc(projectRef, payloadFields);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleUpdateSponsorFundings = async (updatedSponsors: SponsorFunding[]) => {
    if (!selectedProject) return;

    const payloadFields = {
      sponsorFundings: updatedSponsors,
      updatedAt: new Date().toISOString()
    };

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const idx = items.findIndex(p => p.id === selectedProject.id);
        if (idx !== -1) {
          const updatedProj = {
            ...items[idx],
            ...payloadFields
          };
          items[idx] = updatedProj;
          localStorage.setItem("axotic_mock_projects", JSON.stringify(items));
          window.dispatchEvent(new Event("axotic_db_update"));
          setSelectedProject(updatedProj);
        }
      }
      return;
    }

    const projectRef = doc(db, "projects", selectedProject.id);
    try {
      await updateDoc(projectRef, payloadFields);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleUpdateMemberContributions = async (updatedContributions: MemberContribution[]) => {
    if (!selectedProject) return;

    const payloadFields = {
      memberContributions: updatedContributions,
      updatedAt: new Date().toISOString()
    };

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const idx = items.findIndex(p => p.id === selectedProject.id);
        if (idx !== -1) {
          const updatedProj = {
            ...items[idx],
            ...payloadFields
          };
          items[idx] = updatedProj;
          localStorage.setItem("axotic_mock_projects", JSON.stringify(items));
          window.dispatchEvent(new Event("axotic_db_update"));
          setSelectedProject(updatedProj);
        }
      }
      return;
    }

    const projectRef = doc(db, "projects", selectedProject.id);
    try {
      await updateDoc(projectRef, payloadFields);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleUpdatePeerTransfers = async (updatedPeerTransfers: PeerTransfer[]) => {
    if (!selectedProject) return;

    const payloadFields = {
      peerTransfers: updatedPeerTransfers,
      updatedAt: new Date().toISOString()
    };

    if (currentUser.isOfflineMock) {
      const stored = localStorage.getItem("axotic_mock_projects");
      if (stored) {
        const items: Project[] = JSON.parse(stored);
        const idx = items.findIndex(p => p.id === selectedProject.id);
        if (idx !== -1) {
          const updatedProj = {
            ...items[idx],
            ...payloadFields
          };
          items[idx] = updatedProj;
          localStorage.setItem("axotic_mock_projects", JSON.stringify(items));
          window.dispatchEvent(new Event("axotic_db_update"));
          setSelectedProject(updatedProj);
        }
      }
      return;
    }

    const projectRef = doc(db, "projects", selectedProject.id);
    try {
      await updateDoc(projectRef, payloadFields);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  return (
    <>
      <div id="project-hub-root" className="w-full max-w-7xl mx-auto px-1 py-4 space-y-6">
        {selectedProject === null ? (
          <>
        
        {/* Banner Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="size-5.5 text-blue-600" /> Active Project Workspaces
            </h2>
            <p className="text-xs text-slate-500">Decentralized engineering logs,Stockroom allocations and Expenses Spreadsheet.</p>
          </div>
          <button
            id="proj-creation-open-modal"
            onClick={() => setShowCreateModal(true)}
            className="p-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer self-start"
          >
            <Plus className="size-4" /> Initiate Project Cards
          </button>
        </div>

        {/* Filters and search row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:max-w-xs border border-slate-200/50">
            <button
              type="button"
              id="tab-ongoing-projects"
              onClick={() => {
                setProjectTab("ongoing");
              }}
              className={`flex-1 text-center py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                projectTab === "ongoing"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-250/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Ongoing ({ongoingProjects.length})
            </button>
            <button
              type="button"
              id="tab-finished-projects"
              onClick={() => {
                setProjectTab("finished");
                setSelectedProjectIds([]);
              }}
              className={`flex-1 text-center py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                projectTab === "finished"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-250/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Finished Archive ({finishedProjects.length})
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              id="project-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search builds by title..."
              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-8 py-1.5 text-xs outline-hidden focus:ring-1 focus:ring-blue-500/20 font-medium"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="size-3.5" />
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk tools */}
        {filteredProjects.length > 0 && (
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-550/5 border border-slate-200/60 rounded-xl text-xs text-slate-650 transition-all max-w-md">
            <label className="flex items-center gap-2.5 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                id="select-all-filtered-projects"
                checked={filteredProjects.every(p => selectedProjectIds.includes(p.id))}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    const allIds = filteredProjects.map(p => p.id);
                    setSelectedProjectIds(prev => {
                      const newIds = [...prev];
                      allIds.forEach(id => {
                        if (!newIds.includes(id)) {
                          newIds.push(id);
                        }
                      });
                      return newIds;
                    });
                  } else {
                    const allIds = filteredProjects.map(p => p.id);
                    setSelectedProjectIds(prev => prev.filter(id => !allIds.includes(id)));
                  }
                }}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600"
              />
              Select All on Tab
            </label>
            {selectedProjectIds.length > 0 && (
              <button
                type="button"
                id="bulk-clear-selection-btn"
                onClick={() => setSelectedProjectIds([])}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
              >
                Clear Selected Cards ({selectedProjectIds.length})
              </button>
            )}
          </div>
        )}

        {/* Bento grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.length === 0 ? (
            <div id="no-projects-fallback" className="col-span-full bg-white rounded-xl border border-dashed border-slate-200/85 p-12 text-center shadow-2xs">
              {searchQuery ? (
                <>
                  <Search className="size-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-600">No matching builds found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    We couldn't find any projects matching "<strong>{searchQuery}</strong>". Try polishing or resetting your query term.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Clear Search Query
                  </button>
                </>
              ) : (
                <>
                  <Briefcase className="size-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-600">
                    {projectTab === "ongoing" ? "No Ongoing Projects" : "No Finished Projects"}
                  </h3>
                  {projectTab === "ongoing" ? (
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="text-xs text-blue-500 hover:text-blue-600 hover:underline mt-2 font-medium cursor-pointer"
                    >
                      Initiative is open to any active logged-in member. Spawn your first project card here!
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Projects that are fully constructed and marked as finished reside here.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            filteredProjects.map((proj) => (
              <div
                key={proj.id}
                id={`project-card-${proj.id}`}
                onClick={() => {
                  setSelectedProject(proj);
                  setWorkspaceTab("budget"); // Default to comprehensive cost spreadsheet tab
                }}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 p-5 transition-all text-left relative overflow-hidden flex flex-col justify-between cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id={`project-chk-${proj.id}`}
                      checked={selectedProjectIds.includes(proj.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelectProject(proj.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="size-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer accent-blue-600 shrink-0"
                    />
                    <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold rounded-md uppercase tracking-wider select-none ${getStatusStyle(proj.status)}`}>
                      {proj.status}
                    </span>
                  </div>
                  
                  {(isAdmin || proj.createdBy === currentUser.uid) && (
                    <button
                      title="Destructive Delete Project"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(proj.id);
                      }}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md p-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-display text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pb-4">
                    {proj.description || "No description provided. Click to add detailed logistics plans and spreadsheet items."}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span className="flex items-center gap-1 text-slate-600">
                    <User className="size-3.5 text-slate-400" /> Lead: <strong className="text-slate-700 font-medium">{proj.leaderName}</strong>
                  </span>
                  <div className="flex flex-wrap gap-1.5 items-center ml-auto shrink-0 font-mono text-[10px] text-slate-500">
                    {proj.startDate && (
                      <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5" title="Started Date">
                        <span className="text-[8.5px] uppercase font-semibold text-slate-400">Started:</span> {proj.startDate}
                      </span>
                    )}
                    {proj.deadline ? (
                      <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5" title="Due Date">
                        <Calendar className="size-3 text-slate-400" /> Due {proj.deadline}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 border-dashed rounded px-1.5 py-0.5 italic text-slate-450" title="No Due Date">
                        No due date
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
          </>
        ) : (
          <>
      
      {/* Dynamic Slide-Over Back Button */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center">
          <button
            onClick={() => setSelectedProject(null)}
            className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Card Grid
          </button>
        </div>

        {/* Master Heading detail row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none">
              <span>Workspace Workstation</span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-600 font-bold">SERIAL {selectedProject.id.slice(0, 8)}</span>
              {selectedProject.status === "Finished" && (
                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-sans text-[8px] font-extrabold pb-0.5 leading-none">Archived Record</span>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 leading-tight">
              {selectedProject.title}
            </h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              {selectedProject.description || "Academic robotics subsystem detail checklist."}
            </p>
          </div>

          {/* Controls Panel */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-slate-400 font-bold font-sans uppercase">Status:</span>
              {canModifyProject(selectedProject) ? (
                <select
                  id="workspace-status-select"
                  value={selectedProject.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as ProjectStatus)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-hidden transition-all cursor-pointer focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Planning">Planning</option>
                  <option value="Fabricating">Fabricating</option>
                  <option value="Testing">Testing</option>
                  <option value="Continuous">Continuous Development</option>
                  <option value="Finished">Finished Archive 🔒</option>
                </select>
              ) : (
                <span className={`px-2.5 py-1 text-xs border font-bold rounded-lg ${getStatusStyle(selectedProject.status)} flex items-center gap-1`}>
                  <Lock className="size-3" /> {selectedProject.status}
                </span>
              )}
            </div>

            {canModifyProject(selectedProject) && (
              <button
                id="edit-project-details-btn"
                onClick={() => openEditModal(selectedProject)}
                className="p-1 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit project name, description, lead, and team"
              >
                <NotebookPen className="size-3.5" /> Edit Information
              </button>
            )}
          </div>
        </div>

        {/* Roles Details Roster Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-xs text-slate-600 text-left">
          <div className="flex items-center gap-2">
            <User className="size-4 text-slate-400" />
            <span>Leader / Direct Head: <strong className="text-slate-800 font-semibold">{selectedProject.leaderName}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-slate-400" />
            <div className="truncate">
              <span className="font-medium">Assigned Team:</span>
              <span className="text-slate-400 font-normal italic ml-1 select-none">
                {selectedProject.memberNames && selectedProject.memberNames.length > 0 
                  ? selectedProject.memberNames.join(", ") 
                  : "None assigned"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end font-sans">
            {selectedProject.startDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 text-slate-400" />
                <span>Started: <strong className="font-mono text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{selectedProject.startDate}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="size-4 text-slate-400" />
              <span>Target Deadline: <strong className="font-mono text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{selectedProject.deadline || "None set"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs list inside active screen */}
      <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl max-w-md border border-slate-200/50 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => setWorkspaceTab("budget")}
          className={`flex items-center justify-center gap-1.5 text-center py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            workspaceTab === "budget"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-3xs border border-slate-250/25 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="size-3.5 shrink-0" />
          <span className="sm:hidden">Ledger</span>
          <span className="hidden sm:inline">Expenses Ledger</span>
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceTab("subsystems")}
          className={`flex items-center justify-center gap-1.5 text-center py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            workspaceTab === "subsystems"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs border border-slate-250/25 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <FileCheck className="size-3.5 shrink-0" />
          <span className="sm:hidden">Parts</span>
          <span className="hidden sm:inline">Allocated Parts</span>
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceTab("logs")}
          className={`flex items-center justify-center gap-1.5 text-center py-2 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            workspaceTab === "logs"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs border border-slate-250/25 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <NotebookPen className="size-3.5 shrink-0" />
          <span className="sm:hidden">Logs</span>
          <span className="hidden sm:inline">Build Logs</span>
        </button>
      </div>

      {/* Dynamic Tab Body rendering */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left min-h-[45vh] flex flex-col justify-between">
        
        {workspaceTab === "budget" && (
          <div className="space-y-6">
            {(() => {
              const budgetVal = selectedProject.budget || 0;
              const items = selectedProject.budgetItems || [];
              const costVal = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
              const sponsors = selectedProject.sponsorFundings || [];
              const sponsorTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);
              
              const contributions = selectedProject.memberContributions || [];
              const contributionTotal = contributions.reduce((sum, c) => sum + c.amount, 0);
              const memberDonationsTotal = contributions
                .filter(c => c.type === "donation")
                .reduce((sum, c) => sum + c.amount, 0);
              const memberReimbursableTotal = contributions
                .filter(c => c.type === "reimbursable")
                .reduce((sum, c) => sum + c.amount, 0);

              const netCostToSplit = Math.max(0, costVal + memberReimbursableTotal - sponsorTotal - memberDonationsTotal);
              
              const participants = Array.from(new Set([selectedProject.leaderId, ...(selectedProject.memberIds || [])])).filter(Boolean);
              const numParticipants = participants.length || 1;
              const splitMode = selectedProject.costSplitType || "equal";
              const splits = selectedProject.memberCostSplits || {};

              // Calculate total spent by each member
              const spentByMember: Record<string, number> = {};
              participants.forEach(uid => { spentByMember[uid] = 0; });
              items.forEach(it => {
                const paidBy = it.paidById;
                if (spentByMember[paidBy] === undefined) {
                  spentByMember[paidBy] = 0;
                }
                spentByMember[paidBy] += (it.unitCost * it.quantity);
              });

              // Add direct reimbursable contributions to the member's out-of-pocket spent credit
              contributions.forEach(c => {
                if (c.type === "reimbursable") {
                  const contribBy = c.memberId;
                  if (spentByMember[contribBy] === undefined) {
                    spentByMember[contribBy] = 0;
                  }
                  spentByMember[contribBy] += c.amount;
                }
              });

              // Apply recorded peer-to-peer cash transfers to adjust spent out-of-pocket
              const peerTransfers = selectedProject.peerTransfers || [];
              const peerTransfersTotal = peerTransfers.reduce((sum, t) => sum + t.amount, 0);
              peerTransfers.forEach(t => {
                if (spentByMember[t.fromMemberId] !== undefined) {
                  spentByMember[t.fromMemberId] += t.amount;
                }
                if (spentByMember[t.toMemberId] !== undefined) {
                  spentByMember[t.toMemberId] -= t.amount;
                }
              });

              // Calculate fair share per member (offset by sponsor fundings)
              const fairShares: Record<string, number> = {};
              participants.forEach(uid => {
                if (splitMode === "equal") {
                  fairShares[uid] = netCostToSplit / numParticipants;
                } else {
                  fairShares[uid] = splits[uid] || 0;
                }
              });

              const getParticipantName = (uid: string) => {
                const u = roster.find(user => user.uid === uid);
                if (u) return u.displayName;
                if (uid === selectedProject.leaderId) return selectedProject.leaderName;
                const idx = selectedProject.memberIds.indexOf(uid);
                if (idx !== -1 && selectedProject.memberNames?.[idx]) {
                  return selectedProject.memberNames[idx];
                }
                return "Unknown Member";
              };

              const getParticipantRoleLabel = (uid: string) => {
                if (uid === selectedProject.leaderId) return "Lead";
                const u = roster.find(user => user.uid === uid);
                if (u?.role === "admin") return "Admin";
                return "Member";
              };

              const settlements = computeSettlementTransactions(participants, spentByMember, fairShares, getParticipantName);

              const percentOfBudget = budgetVal > 0 ? (costVal / budgetVal) * 100 : 0;
              const isOverBudget = budgetVal > 0 && costVal > budgetVal;

              const handleDeleteBudgetItem = (itemId: string) => {
                const updated = items.filter(it => it.id !== itemId);
                handleUpdateBudgetItems(updated);
              };

              const handleExportCSV = () => {
                if (!selectedProject) return;
                
                const rows: string[][] = [];
                
                // Title
                rows.push([`Project Finance Sheet: ${selectedProject.title}`]);
                rows.push([`Exported on: ${new Date().toLocaleString()}`]);
                rows.push([]);
                
                // Summary Section
                rows.push(["FINANCIAL STATUS SUMMARY"]);
                rows.push(["Metric", "Value (LKR)"]);
                rows.push(["Total Project Budget", budgetVal.toFixed(2)]);
                rows.push(["Total Cost Sum (Spreadsheet)", costVal.toFixed(2)]);
                rows.push(["Sponsor Funding (Inbound)", sponsorTotal.toFixed(2)]);
                rows.push(["Member Contributions Total", contributionTotal.toFixed(2)]);
                rows.push(["  - Reimbursable Contributions", memberReimbursableTotal.toFixed(2)]);
                rows.push(["  - Gift Donations", memberDonationsTotal.toFixed(2)]);
                rows.push(["Net Member Cost to Split", netCostToSplit.toFixed(2)]);
                rows.push(["Total Members Shared", numParticipants.toString()]);
                rows.push(["Target Share Per Member", (netCostToSplit / numParticipants).toFixed(2)]);
                rows.push([]);
                
                // Section 1: Spreadsheet items
                rows.push(["PROJECT SPREADSHEET EXPENSES"]);
                rows.push(["Item Name", "Paid By (UID)", "Paid By (Name)", "Unit Cost (LKR)", "Quantity", "Total Cost (LKR)"]);
                items.forEach(it => {
                  rows.push([
                    it.name,
                    it.paidById,
                    getParticipantName(it.paidById),
                    it.unitCost.toString(),
                    it.quantity.toString(),
                    (it.unitCost * it.quantity).toFixed(2)
                  ]);
                });
                rows.push([]);
                
                // Section 2: Sponsors
                rows.push(["EXTERNAL TRUST SPONSORSHIPS"]);
                rows.push(["Sponsor Name", "Purpose Notes", "Funding Amount (LKR)"]);
                sponsors.forEach(s => {
                  rows.push([
                    s.sponsorName,
                    s.notes || "",
                    s.amount.toFixed(2)
                  ]);
                });
                rows.push([]);
                
                // Section 3: Member Cash Contributions
                rows.push(["DIRECT MEMBER CASH CONTRIBUTIONS"]);
                rows.push(["Contributor UID", "Contributor Name", "Treatment / Type", "Deposit Notes", "Amount (LKR)"]);
                contributions.forEach(c => {
                  rows.push([
                    c.memberId,
                    getParticipantName(c.memberId),
                    c.type === "reimbursable" ? "Reimbursable Cost Offset" : "Gift Donation Offset",
                    c.notes || "",
                    c.amount.toFixed(2)
                  ]);
                });
                rows.push([]);

                // Section 3.5: Peer-to-Peer Direct Transfers
                rows.push(["RECORDED DIRECT PEER-TO-PEER TRANSFERS"]);
                rows.push(["Payer (From)", "Transfer Notes", "Recipient (To)", "Amount (LKR)"]);
                peerTransfers.forEach(pt => {
                  rows.push([
                    getParticipantName(pt.fromMemberId),
                    pt.notes || "Direct Reimbursement",
                    getParticipantName(pt.toMemberId),
                    pt.amount.toFixed(2)
                  ]);
                });
                rows.push([]);

                // Section 4: Individual Balances
                rows.push(["INDIVIDUAL MEMBER COST BREAKDOWN & BALANCE"]);
                rows.push(["Member Name", "Gross Out-of-Pocket Spent (LKR)", "Fair Target Cost Share (LKR)", "Net Balance (LKR)"]);
                participants.forEach(uid => {
                  const grossSpent = spentByMember[uid] || 0;
                  const fairShare = fairShares[uid] || 0;
                  const bal = grossSpent - fairShare;
                  rows.push([
                    getParticipantName(uid),
                    grossSpent.toFixed(2),
                    fairShare.toFixed(2),
                    bal.toFixed(2)
                  ]);
                });
                rows.push([]);

                // Section 5: Settlement Plan
                rows.push(["RECOMMENDED TRANSACTIONS TO SETTLE BALANCES"]);
                rows.push(["Debtor / Payer Name", "Action Phrase", "Creditor / Recipient Name", "Payment Amount (LKR)"]);
                settlements.forEach(tx => {
                  rows.push([
                    tx.from,
                    "pays directly to",
                    tx.to,
                    tx.amount.toFixed(2)
                  ]);
                });

                // Generate CSV string safe from delimiters
                const csvString = rows
                  .map(row => 
                    row.map(cell => {
                      const escapedVal = (cell || "").toString().replace(/"/g, '""');
                      if (escapedVal.includes(",") || escapedVal.includes('"') || escapedVal.includes("\n")) {
                        return `"${escapedVal}"`;
                      }
                      return escapedVal;
                    }).join(",")
                  )
                  .join("\n");
                
                const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const clickLink = document.createElement("a");
                clickLink.href = url;
                clickLink.setAttribute("download", `${selectedProject.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_ledger_export.csv`);
                document.body.appendChild(clickLink);
                clickLink.click();
                document.body.removeChild(clickLink);
                URL.revokeObjectURL(url);
              };

              return (
                <div className="space-y-6">
                  {/* Ledger summary banner */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 select-none">
                        <Coins className="size-4 text-emerald-600" />
                        Finances Overview
                      </h3>
                      <p className="text-[11px] text-slate-500">Live spreadsheet estimates compared to budget limits.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full select-none border self-start md:self-auto ${
                        isOverBudget 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : budgetVal > 0 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250/20" 
                            : "bg-slate-100 text-slate-500 border-slate-205"
                      }`}>
                        {isOverBudget 
                          ? `Over budget limit by LKR ${(costVal - budgetVal).toFixed(2)}` 
                          : budgetVal > 0 
                            ? "Within Budget" 
                            : "Budget Cap Not Configured"}
                      </span>

                      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5">
                        <button
                          type="button"
                          onClick={() => setShowPrintModal(true)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-250/70 rounded-md text-[11px] font-bold transition-all shadow-2xs select-none cursor-pointer"
                          title="Generate high contrast, ink-friendly printable statement"
                        >
                          <Printer className="size-3.5 text-slate-500" />
                          <span>Print Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportCSV}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition-all shadow-2xs select-none cursor-pointer"
                          title="Export all ledger details to CSV spreadsheet"
                        >
                          <Download className="size-3.5" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Highlights row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">Total Project Budget</div>
                      <div className="text-xl font-bold text-slate-800 font-mono mt-0.5 font-semibold">
                        LKR {budgetVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Cost Sum (Spreadsheet)</div>
                      <div className="text-xl font-bold text-slate-850 font-mono mt-0.5 font-semibold">
                        LKR {costVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/60">
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Sponsor Funding (Inbound)</div>
                      <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5 font-black">
                        LKR {sponsorTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-blue-50/20 p-4 rounded-xl border border-blue-100/60">
                      <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Member Contributions</div>
                      <div className="text-xl font-bold text-blue-700 font-mono mt-0.5 font-black">
                        LKR {contributionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[8px] text-slate-400 mt-1 font-sans">
                        Reimbursable: LKR {memberReimbursableTotal.toFixed(0)} | Donations: LKR {memberDonationsTotal.toFixed(0)}
                      </div>
                    </div>
                    <div className="bg-slate-50/40 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 font-semibold">Consumption</div>
                      {budgetVal > 0 ? (
                        <div>
                          <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden mb-1">
                            <div 
                              className={`h-full transition-all duration-300 ${isOverBudget ? 'bg-red-500' : percentOfBudget > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, percentOfBudget)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-slate-500">
                            <span>{percentOfBudget.toFixed(1)}% consumed</span>
                            <span>LKR {Math.max(0, budgetVal - costVal).toLocaleString('en-US', { maximumFractionDigits: 2 })} remaining</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic font-sans leading-tight">Configure budget allowance in Information options.</div>
                      )}
                    </div>
                  </div>

                  {/* REAL EXCEL-LIKE SPREADSHEET LEDGER TABLE */}
                  <div className="space-y-2 text-left">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 select-none">
                      <FileText className="size-4 text-slate-600" />
                      Estimates spreadsheet
                    </h4>
                    
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="p-3 border-r border-slate-200">#</th>
                            <th className="p-3 border-r border-slate-200 w-2/5">Item description & specifications</th>
                            <th className="p-3 border-r border-slate-200 text-right w-1/6">Unit Cost (LKR)</th>
                            <th className="p-3 border-r border-slate-200 text-center w-12">Qty</th>
                            <th className="p-3 border-r border-slate-200 text-right w-1/6">Line Total (LKR)</th>
                            <th className="p-3 border-r border-slate-200 w-1/5">Paid & Funded By</th>
                            <th className="p-3 text-center w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic bg-white">
                                Ledger workbook is empty. Fill row parameters below to start calculating hardware splits.
                              </td>
                            </tr>
                          ) : (
                            items.map((it, idx) => (
                              <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-mono text-slate-400 border-r border-slate-200 text-[10px] text-center select-none">{idx + 1}</td>
                                <td className="p-3 font-medium text-slate-800 border-r border-slate-200 pr-4">{it.name}</td>
                                <td className="p-3 font-mono text-right border-r border-slate-200 pr-4">
                                  LKR {it.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 font-mono text-center border-r border-slate-200">{it.quantity}</td>
                                <td className="p-3 font-mono text-right border-r border-slate-200 font-bold text-slate-900 pr-4">
                                  LKR {(it.unitCost * it.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 border-r border-slate-200">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700 truncate">{getParticipantName(it.paidById)}</span>
                                    <span className="text-[8px] uppercase tracking-wide bg-slate-100 text-slate-500 font-bold px-1 rounded-sm">
                                      {getParticipantRoleLabel(it.paidById)}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  {canModifyProject(selectedProject) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBudgetItem(it.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Remove item row"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}

                          {/* DYNAMIC ROW CREATION INPUT - ACTIVE LEDGER */}
                          {canModifyProject(selectedProject) && (
                            <tr className="bg-blue-50/30">
                              <td className="p-3 font-mono text-blue-500 text-center font-bold border-r border-slate-200">+</td>
                              <td className="p-2 border-r border-slate-200">
                                <input
                                  type="text"
                                  placeholder="e.g. BLDC Motor 2300KV"
                                  value={newBItemName}
                                  onChange={(e) => setNewBItemName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 hover:border-slate-350 rounded px-2.5 py-1.5 text-xs outline-hidden"
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2.5 text-slate-450 font-mono text-[9px] leading-none select-none">LKR</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={newBItemUnitCost}
                                    onChange={(e) => setNewBItemUnitCost(e.target.value)}
                                    className="w-full bg-white border border-slate-200 focus:border-blue-500 hover:border-slate-350 rounded pl-10 pr-2.5 py-1.5 text-xs text-right font-mono outline-hidden"
                                  />
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  value={newBItemQuantity}
                                  onChange={(e) => setNewBItemQuantity(e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 hover:border-slate-350 rounded px-2.5 py-1.5 text-xs text-center font-mono outline-hidden"
                                />
                              </td>
                              <td className="p-3 border-r border-slate-200 font-mono text-right font-bold text-slate-500 bg-slate-50 select-none pr-4">
                                LKR {( (parseFloat(newBItemUnitCost) || 0) * (parseInt(newBItemQuantity) || 1) ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <select
                                  value={newBItemPaidById}
                                  onChange={(e) => setNewBItemPaidById(e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-blue-500 hover:border-slate-350 rounded px-2 py-1.5 text-xs cursor-pointer text-slate-700 outline-hidden font-medium"
                                >
                                  <option value="">Who paid?</option>
                                  {participants.map(pId => (
                                    <option key={pId} value={pId}>{getParticipantName(pId)}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newBItemName.trim()) {
                                      alert("Please enter a valid description for the part row.");
                                      return;
                                    }
                                    if (!newBItemPaidById) {
                                      alert("Select which member paid / provided funding.");
                                      return;
                                    }
                                    const uCost = parseFloat(newBItemUnitCost) || 0;
                                    const q = parseInt(newBItemQuantity) || 1;
                                    const newItemItem: BudgetItem = {
                                      id: `bitem-${Date.now()}`,
                                      name: newBItemName.trim(),
                                      unitCost: uCost,
                                      quantity: q,
                                      paidById: newBItemPaidById
                                    };
                                    
                                    const nextItems = [...items, newItemItem];
                                    handleUpdateBudgetItems(nextItems);
                                    
                                    // Reset fields
                                    setNewBItemName("");
                                    setNewBItemUnitCost("");
                                    setNewBItemQuantity("1");
                                    setNewBItemPaidById("");
                                  }}
                                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-black rounded-lg cursor-pointer hover:shadow-xs transition-all active:scale-98"
                                >
                                  Insert Row
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SPONSOR & EXTERNAL FUNDING */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 select-none">
                        <Briefcase className="size-4 text-indigo-600" />
                        Sponsors & Offsetting Grants
                      </h4>
                      <p className="text-[10px] text-slate-450 italic">
                        Document scholarships, academic grants, or external sponsorships that reduce out-of-pocket costs for members.
                      </p>
                    </div>

                    {/* Sponsor entries listing table */}
                    <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 space-y-4">
                      {sponsors.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-lg border border-slate-150">
                          No external sponsor funding logged yet. Add sources below to offset member expense allocations!
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider select-none">
                                <th className="p-2.5">Sponsor / Grant Entity</th>
                                <th className="p-2.5">Target notes</th>
                                <th className="p-2.5 text-right w-1/4">Amount (LKR)</th>
                                <th className="p-2.5 text-center w-16">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {sponsors.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/40">
                                  <td className="p-2.5 font-bold text-slate-800">{s.sponsorName}</td>
                                  <td className="p-2.5 text-slate-500 italic">{s.notes || "-"}</td>
                                  <td className="p-2.5 font-mono text-right font-black text-emerald-600">
                                    LKR {s.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {canModifyProject(selectedProject) ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextSponsors = sponsors.filter(item => item.id !== s.id);
                                          handleUpdateSponsorFundings(nextSponsors);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Remove sponsor funding"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add Sponsorship inline controls */}
                      {canModifyProject(selectedProject) && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-150 space-y-3">
                          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-650 flex items-center gap-1">
                            <Plus className="size-3.5 text-indigo-505" /> Add Inbound Sponsor Support Row
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                            <div>
                              <input
                                type="text"
                                placeholder="Sponsor (e.g. AXOTIC Hub, Grant, Aerospace Club)"
                                value={newSponsorName}
                                onChange={(e) => setNewSponsorName(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs outline-hidden shrink-0"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-[9px] leading-none select-none font-normal">LKR</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Amount value"
                                value={newSponsorAmount}
                                onChange={(e) => setNewSponsorAmount(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-indigo-500 rounded pl-10 pr-2.5 py-1.5 text-xs text-right font-mono outline-hidden"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Purpose notes (e.g. PCB fabrication costs)"
                                value={newSponsorNotes}
                                onChange={(e) => setNewSponsorNotes(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs outline-hidden"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newSponsorName.trim()) {
                                  alert("Please enter the Sponsor Name.");
                                  return;
                                }
                                const amt = parseFloat(newSponsorAmount);
                                if (isNaN(amt) || amt <= 0) {
                                  alert("Please enter a valid funding amount greater than 0.");
                                  return;
                                }
                                const nextSponsors = [
                                  ...sponsors,
                                  {
                                    id: `sponsor-${Date.now()}`,
                                    sponsorName: newSponsorName.trim(),
                                    amount: amt,
                                    notes: newSponsorNotes.trim(),
                                    createdAt: new Date().toISOString()
                                  }
                                ];
                                handleUpdateSponsorFundings(nextSponsors);
                                
                                // Reset
                                setNewSponsorName("");
                                setNewSponsorAmount("");
                                setNewSponsorNotes("");
                              }}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold rounded-md cursor-pointer hover:shadow-xs transition-all active:scale-98"
                            >
                              Add Sponsorship Record
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DIRECT MEMBER CASH / FUNDING CONTRIBUTIONS */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-750 tracking-wider flex items-center gap-1.5 select-none">
                        <Users className="size-4 text-emerald-600" />
                        Direct Member Cash Contributions
                      </h4>
                      <p className="text-[10px] text-slate-400 italic">
                        Record when a project member directly contributes cash/funds to the project treasury or material pool.
                      </p>
                    </div>

                    {/* Member contributions listing table */}
                    <div className="bg-slate-50/40 border border-slate-200/60 rounded-xl p-4 space-y-4">
                      {contributions.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-lg border border-slate-150">
                          No direct member cash contributions logged yet. Record entries below to credit members for direct financial deposits!
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-150 rounded-lg overflow-hidden shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider select-none">
                                <th className="p-2.5">Contributor Member</th>
                                <th className="p-2.5">Accounting Treatment</th>
                                <th className="p-2.5">Target notes</th>
                                <th className="p-2.5 text-right w-1/4">Amount (LKR)</th>
                                <th className="p-2.5 text-center w-16">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {contributions.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/40">
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-800">{getParticipantName(c.memberId)}</span>
                                      <span className="text-[8px] uppercase tracking-wide bg-slate-100 text-slate-550 font-bold px-1 rounded-sm">
                                        {getParticipantRoleLabel(c.memberId)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2.5">
                                    <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded leading-none ${
                                      c.type === "reimbursable" 
                                        ? "bg-blue-50 text-blue-700 border border-blue-200/30" 
                                        : "bg-purple-50 text-purple-700 border border-purple-200/30"
                                    }`}>
                                      {c.type === "reimbursable" ? "Reimbursable Split Credit" : "Direct Gift / Non-Reimbursable"}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-500 italic">{c.notes || "-"}</td>
                                  <td className="p-2.5 font-mono text-right font-black text-emerald-600">
                                    LKR {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {canModifyProject(selectedProject) ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextContribs = contributions.filter(item => item.id !== c.id);
                                          handleUpdateMemberContributions(nextContribs);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Remove contribution"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add Member Contribution inline controls */}
                      {canModifyProject(selectedProject) && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-150 space-y-3">
                          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-650 flex items-center gap-1 mb-1">
                            <Plus className="size-3.5 text-emerald-600" /> Log Custom Member Cash Contribution
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                            {/* Member Dropdown */}
                            <div>
                              <select
                                value={newContribMemberId}
                                onChange={(e) => setNewContribMemberId(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded px-2 py-1.5 text-xs text-slate-700 outline-hidden font-medium cursor-pointer"
                              >
                                <option value="">Select Contributor...</option>
                                {participants.map(pId => (
                                  <option key={pId} value={pId}>{getParticipantName(pId)}</option>
                                ))}
                              </select>
                            </div>

                            {/* Amount field */}
                            <div className="relative">
                              <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-[9px] leading-none select-none font-normal">LKR</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Amount deposited"
                                value={newContribAmount}
                                onChange={(e) => setNewContribAmount(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded pl-10 pr-2.5 py-1.5 text-xs text-right font-mono outline-hidden"
                              />
                            </div>

                            {/* Treatment Type selector */}
                            <div>
                              <select
                                value={newContribType}
                                onChange={(e) => setNewContribType(e.target.value as "reimbursable" | "donation")}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded px-2 py-1.5 text-xs text-slate-700 outline-hidden font-medium cursor-pointer"
                              >
                                <option value="reimbursable">Reimbursable Split Credit</option>
                                <option value="donation">Gift Donation (Offset split cost)</option>
                              </select>
                            </div>

                            {/* Purpose notes */}
                            <div>
                              <input
                                type="text"
                                placeholder="Purpose notes (e.g. deposited cash, upfront payment)"
                                value={newContribNotes}
                                onChange={(e) => setNewContribNotes(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] text-slate-450 max-w-xl leading-relaxed text-left">
                              {newContribType === "reimbursable" 
                                ? "💡 Reimbursable: This amount is added to the total project cost to be divided split-wise among all members, and credited fully to the contributor's 'Spent' column." 
                                : "🎁 Donation: This offsets the net cost split directly, decreasing everyone's out-of-pocket shares without reimbursement."
                              }
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newContribMemberId) {
                                  alert("Please select the contributor member.");
                                  return;
                                }
                                const amt = parseFloat(newContribAmount);
                                if (isNaN(amt) || amt <= 0) {
                                  alert("Please enter a valid contribution amount greater than 0.");
                                  return;
                                }
                                const nextContribs = [
                                  ...contributions,
                                  {
                                    id: `contrib-${Date.now()}`,
                                    memberId: newContribMemberId,
                                    amount: amt,
                                    notes: newContribNotes.trim(),
                                    type: newContribType,
                                    createdAt: new Date().toISOString()
                                  }
                                ];
                                handleUpdateMemberContributions(nextContribs);
                                
                                // Reset
                                setNewContribMemberId("");
                                setNewContribAmount("");
                                setNewContribNotes("");
                                setNewContribType("reimbursable");
                              }}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold rounded-md cursor-pointer hover:shadow-xs transition-all active:scale-98 shrink-0"
                            >
                              Log Contribution
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DIRECT PEER-TO-PEER TRANSFERS */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-2 border-dashed">
                      <h4 className="text-xs font-bold uppercase text-slate-750 tracking-wider flex items-center gap-1.5 select-none font-semibold">
                        <Coins className="size-4 text-emerald-600" />
                        Direct Peer-to-Peer Transfers
                      </h4>
                      <p className="text-[10px] text-slate-400 italic">
                        Record offline transfers (hand-to-hand money or bank transfers) from one member to another to offset project debts.
                      </p>
                    </div>

                    <div className="bg-slate-50/40 border border-slate-200/60 rounded-xl p-4 space-y-4">
                      {peerTransfers.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-lg border border-slate-150">
                          No peer-to-peer payments logged yet. Fill out fields below to record cash or direct transfers.
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-150 rounded-lg overflow-hidden shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider select-none">
                                <th className="p-2.5">Payer (From)</th>
                                <th className="p-2.5 text-center w-12">Transfer</th>
                                <th className="p-2.5">Recipient (To)</th>
                                <th className="p-2.5">Transfer notes</th>
                                <th className="p-2.5 text-right w-1/4">Amount (LKR)</th>
                                <th className="p-2.5 text-center w-16">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {peerTransfers.map((pt) => (
                                <tr key={pt.id} className="hover:bg-slate-50/40">
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-slate-800">{getParticipantName(pt.fromMemberId)}</span>
                                      <span className="text-[8px] uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded-sm">
                                        Payer
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center text-slate-400 font-bold font-mono">➜</td>
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-slate-800">{getParticipantName(pt.toMemberId)}</span>
                                      <span className="text-[8px] uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200 px-1 rounded-sm">
                                        Recipient
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-slate-500 italic truncate max-w-[150px]" title={pt.notes}>{pt.notes || "Direct Payment"}</td>
                                  <td className="p-2.5 font-mono text-right font-black text-rose-600">
                                    LKR {pt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {canModifyProject(selectedProject) ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextTransfers = peerTransfers.filter(item => item.id !== pt.id);
                                          handleUpdatePeerTransfers(nextTransfers);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Remove Peer Transfer Record"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add Peer Transfer Inline Controls */}
                      {canModifyProject(selectedProject) && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-150 space-y-3">
                          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-650 flex items-center gap-1 mb-1">
                            <Plus className="size-3.5 text-emerald-600" /> Record Offline Peer Transfer Row
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                            {/* From Dropdown */}
                            <div>
                              <select
                                value={newTransferFromMemberId}
                                onChange={(e) => setNewTransferFromMemberId(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded px-2 py-1.5 text-xs text-slate-700 outline-hidden font-medium cursor-pointer"
                              >
                                <option value="">Select Payer (From)...</option>
                                {participants.map(pId => (
                                  <option key={pId} value={pId}>{getParticipantName(pId)}</option>
                                ))}
                              </select>
                            </div>

                            {/* To Dropdown */}
                            <div>
                              <select
                                value={newTransferToMemberId}
                                onChange={(e) => setNewTransferToMemberId(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded px-2 py-1.5 text-xs text-slate-700 outline-hidden font-medium cursor-pointer"
                              >
                                <option value="">Select Recipient (To)...</option>
                                {participants.map(pId => (
                                  <option key={pId} value={pId}>{getParticipantName(pId)}</option>
                                ))}
                              </select>
                            </div>

                            {/* Amount field */}
                            <div className="relative">
                              <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-[9px] leading-none select-none font-normal">LKR</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Amount (LKR)"
                                value={newTransferAmount}
                                onChange={(e) => setNewTransferAmount(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded pl-10 pr-2.5 py-1.5 text-xs text-right font-mono outline-hidden"
                              />
                            </div>

                            {/* Purpose notes */}
                            <div>
                              <input
                                type="text"
                                placeholder="Purpose notes (e.g., cash refund, bank transfer)"
                                value={newTransferNotes}
                                onChange={(e) => setNewTransferNotes(e.target.value)}
                                className="w-full bg-white border border-slate-205 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] text-slate-450 max-w-xl leading-relaxed text-left font-sans">
                              💡 Record custom offline settles. This credits the Sender (increases their out-of-pocket spent column) and debits the Receiver (decreases their remaining target split balance).
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newTransferFromMemberId) {
                                  alert("Please select the Payer member (From).");
                                  return;
                                }
                                if (!newTransferToMemberId) {
                                  alert("Please select the Recipient member (To).");
                                  return;
                                }
                                if (newTransferFromMemberId === newTransferToMemberId) {
                                  alert("Cannot transfer money to the same person. Please pick different members.");
                                  return;
                                }
                                const amt = parseFloat(newTransferAmount);
                                if (isNaN(amt) || amt <= 0) {
                                  alert("Please enter a valid transfer amount greater than 0.");
                                  return;
                                }
                                const nextTransfers = [
                                  ...peerTransfers,
                                  {
                                    id: `transfer-${Date.now()}`,
                                    fromMemberId: newTransferFromMemberId,
                                    toMemberId: newTransferToMemberId,
                                    amount: amt,
                                    notes: newTransferNotes.trim(),
                                    createdAt: new Date().toISOString()
                                  }
                                ];
                                handleUpdatePeerTransfers(nextTransfers);
                                
                                // Reset
                                setNewTransferFromMemberId("");
                                setNewTransferToMemberId("");
                                setNewTransferAmount("");
                                setNewTransferNotes("");
                              }}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold rounded-md cursor-pointer hover:shadow-xs transition-all active:scale-98 shrink-0 font-bold"
                            >
                              Log Peer Transfer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COST DIVISION SPLIT BREAKDOWN */}
                  <div className="space-y-4 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5 select-none font-medium">
                        <Users className="size-4 text-blue-600" />
                        Allocated Funding, Imbalances and Reimbursement Splits
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        {(sponsorTotal > 0 || memberDonationsTotal > 0) && (
                          <span className="text-[9px] font-extrabold uppercase bg-emerald-50 border border-emerald-250/20 px-2 py-0.5 rounded text-emerald-700 select-none">
                            Net cost split: LKR {netCostToSplit.toFixed(2)} 
                            {sponsorTotal > 0 && ` (Sponsor Support: LKR ${sponsorTotal.toFixed(2)})`}
                            {memberDonationsTotal > 0 && ` (Member Donations: LKR ${memberDonationsTotal.toFixed(2)})`}
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 select-none">
                          Split Rule: {splitMode === "equal" ? "Equal Division splitting" : "Custom Custom Divisions"}
                        </span>
                      </div>
                    </div>

                    {/* Member financial imbalance grid cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {participants.map((uid) => {
                        const name = getParticipantName(uid);
                        const role = getParticipantRoleLabel(uid);
                        const spent = spentByMember[uid] || 0;
                        const share = fairShares[uid] || 0;
                        const balance = spent - share;

                        return (
                          <div key={uid} className="bg-white p-3.5 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3 hover:border-slate-350 transition-colors shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                                <span className={`text-[8px] font-extrabold px-1 rounded-sm tracking-wide ${
                                  role === "Lead" 
                                    ? "bg-blue-50 text-blue-700 border border-blue-200/50" 
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {role}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                                  balance > 0.01 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : balance < -0.01 
                                      ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                      : "bg-slate-100 text-slate-500 border border-slate-150"
                                } border`}>
                                  {balance > 0.01 
                                    ? `Receives LKR ${balance.toFixed(2)}` 
                                    : balance < -0.01 
                                      ? `Owes LKR ${Math.abs(balance).toFixed(2)}` 
                                      : "Even"}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                              <div>
                                <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[8px]">Funded Out of Pocket</span>
                                <span className="font-mono font-bold text-slate-700">LKR {spent.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[8px]">Fair target share</span>
                                <span className="font-mono font-bold text-slate-700">LKR {share.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* SETTLEMENT ENGINE TRANSACTIONS (HOW TO TRANSFER MONEY) */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 text-left space-y-3.5">
                      <div className="flex items-center gap-1.5 pb-1 select-none border-b border-slate-200/50">
                        <Coins className="size-4.5 text-amber-600 animate-bounce" />
                        <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                          Greedy Settlement Transfer Plan
                        </h4>
                      </div>

                      {settlements.length === 0 ? (
                        <p className="text-xs text-slate-450 italic">
                          No transactions are required. All participant out-of-pocket funding balances are perfectly balanced with target divided shares!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-500 select-none">
                            Execute the following clear transfers outside the system (e.g. Bank transfer, Venmo or Cash) to completely settle the project cost estimates:
                          </p>
                          <div className="space-y-1.5 max-h-[150px] overflow-y-auto w-full pr-1">
                            {settlements.map((tx, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700">
                                  💵 <strong className="text-slate-900">{tx.from}</strong> needs to transfer money directly to <strong className="text-slate-900">{tx.to}</strong>
                                </span>
                                <span className="font-mono font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded leading-none">
                                  LKR {tx.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRINTABLE / SUMMARY REPORT OVERLAY MODAL */}
                  <AnimatePresence>
                    {showPrintModal && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          id="financial-print-modal"
                          className="bg-white text-slate-850 rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200"
                        >
                          {/* Inject the styling rules for print media dynamically inside the report modal */}
                          <style dangerouslySetInnerHTML={{__html: `
                            @media print {
                              body * {
                                visibility: hidden !important;
                              }
                              #financial-print-modal, #financial-print-modal * {
                                visibility: visible !important;
                              }
                              #financial-print-modal {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                background: white !important;
                                color: black !important;
                                box-shadow: none !important;
                                border: none !important;
                                padding: 0 !important;
                                margin: 0 !important;
                              }
                              .no-print {
                                display: none !important;
                              }
                            }
                          `}} />

                          {/* Report Header */}
                          <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-indigo-600 font-extrabold no-print">
                                Financial Ledger & Settlement Statement
                              </div>
                              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                {selectedProject.title}
                              </h2>
                              <p className="text-xs text-slate-500 mt-1">
                                Generated: <strong className="text-slate-800">{new Date().toLocaleString()}</strong> | Leader: <strong className="text-slate-800">{selectedProject.leaderName}</strong>
                              </p>
                            </div>
                            <div className="text-left md:text-right text-xs text-slate-500 border-l-2 md:border-l-0 md:border-r-2 border-slate-300 pl-3 md:pl-0 md:pr-3">
                              <span className="block text-[9px] uppercase tracking-widest font-black text-slate-400">System Source</span>
                              <span className="font-extrabold text-slate-800 font-mono">AXOTIC Project Hub</span>
                            </div>
                          </div>

                          {/* Dashboard Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-150 pb-5">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-155 text-left">
                              <span className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Project Budget</span>
                              <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                                LKR {budgetVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-155 text-left">
                              <span className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Spreadsheet Cost</span>
                              <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                                LKR {costVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-155 text-left">
                              <span className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Sponsor Offsets</span>
                              <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                                LKR {sponsorTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-155 text-left">
                              <span className="block text-[9px] font-bold uppercase text-emerald-800 tracking-wider">Net Cost split</span>
                              <span className="font-mono text-sm sm:text-base font-black text-emerald-600">
                                LKR {netCostToSplit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-5 overflow-y-auto max-h-[45vh] pr-1">
                            {/* Section 1: Itemized Expenses */}
                            <div className="space-y-2 text-left">
                              <h3 className="text-xs font-black uppercase text-slate-800 border-b border-slate-300 pb-1.5 tracking-wider font-mono">
                                1. Itemized Design Spreadsheet Expenses
                              </h3>
                              {items.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No expense items logged.</p>
                              ) : (
                                <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                                  <thead>
                                    <tr className="bg-slate-55/60 border-b border-slate-300 text-slate-650 font-bold uppercase text-[9px]">
                                      <th className="p-2 border-r border-slate-200">Item Name</th>
                                      <th className="p-2 border-r border-slate-200">Paid By</th>
                                      <th className="p-2 text-right border-r border-slate-200">Unit Cost (LKR)</th>
                                      <th className="p-2 text-center border-r border-slate-200">Quantity</th>
                                      <th className="p-2 text-right">Total (LKR)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150">
                                    {items.map((it) => (
                                      <tr key={it.id}>
                                        <td className="p-2 border-r border-slate-150 font-bold text-slate-805">{it.name}</td>
                                        <td className="p-2 border-r border-slate-150">{getParticipantName(it.paidById)}</td>
                                        <td className="p-2 text-right border-r border-slate-150 font-mono">
                                          {it.unitCost.toLocaleString()}
                                        </td>
                                        <td className="p-2 text-center border-r border-slate-150 font-mono">{it.quantity}</td>
                                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                                          {(it.unitCost * it.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            {/* Section 2: Sponsor & Direct Contributions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                              <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase text-slate-800 border-b border-slate-300 pb-1.5 tracking-wider font-mono">
                                  2. Sponsors & Grants
                                </h3>
                                {sponsors.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No external sponsor funding logged.</p>
                                ) : (
                                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                                    <thead>
                                      <tr className="bg-slate-55/60 border-b border-slate-300 text-slate-650 font-bold uppercase text-[9px]">
                                        <th className="p-2 border-r border-slate-200">Sponsor Name</th>
                                        <th className="p-2 border-r border-slate-200">Notes</th>
                                        <th className="p-2 text-right">Amount (LKR)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150">
                                      {sponsors.map((s) => (
                                        <tr key={s.id}>
                                          <td className="p-2 border-r border-slate-150 font-bold">{s.sponsorName}</td>
                                          <td className="p-2 border-r border-slate-150 text-slate-500 italic">{s.notes || "-"}</td>
                                          <td className="p-2 text-right font-mono font-bold text-emerald-600">
                                            {s.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                              <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase text-slate-800 border-b border-slate-300 pb-1.5 tracking-wider font-mono">
                                  3. Member Cash Contributions
                                </h3>
                                {contributions.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No member contributions logged.</p>
                                ) : (
                                  <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                                    <thead>
                                      <tr className="bg-slate-55/60 border-b border-slate-300 text-slate-650 font-bold uppercase text-[9px]">
                                        <th className="p-2 border-r border-slate-200">Member Name</th>
                                        <th className="p-2 border-r border-slate-200">Treatment</th>
                                        <th className="p-2 text-right">Amount (LKR)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150">
                                      {contributions.map((c) => (
                                        <tr key={c.id}>
                                          <td className="p-2 border-r border-slate-150 font-bold">{getParticipantName(c.memberId)}</td>
                                          <td className="p-2 border-r border-slate-150 text-[10px]">
                                            {c.type === "reimbursable" ? "Reimbursable Split" : "Donation offset"}
                                          </td>
                                          <td className="p-2 text-right font-mono font-bold text-blue-600">
                                            {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>

                            {/* Section 3: Cost Splits and Balances */}
                            <div className="space-y-2 text-left">
                              <h3 className="text-xs font-black uppercase text-slate-800 border-b border-slate-300 pb-1.5 tracking-wider font-mono">
                                4. Member Spent Credits and Divided Shares
                              </h3>
                              <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                                <thead>
                                  <tr className="bg-slate-55/60 border-b border-slate-300 text-slate-650 font-bold uppercase text-[9px]">
                                    <th className="p-2 border-r border-slate-200">Project Member</th>
                                    <th className="p-2 text-right border-r border-slate-200 font-mono">Gross Out-of-Pocket Spent (A)</th>
                                    <th className="p-2 text-right border-r border-slate-200 font-mono">Fair divided Cost Share (B)</th>
                                    <th className="p-2 text-right font-bold">Net Balance Due / Receivable (A - B)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150">
                                  {participants.map((pId) => {
                                    const spent = spentByMember[pId] || 0;
                                    const share = fairShares[pId] || 0;
                                    const bal = spent - share;
                                    return (
                                      <tr key={pId}>
                                        <td className="p-2 border-r border-slate-150 font-bold text-slate-805">
                                          {getParticipantName(pId)} 
                                          <span className="text-[8px] uppercase text-slate-400 font-mono font-normal ml-1">
                                            ({getParticipantRoleLabel(pId)})
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono border-r border-slate-150">{spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2 text-right font-mono border-r border-slate-150">{share.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className={`p-2 text-right font-mono font-bold ${
                                          bal > 0.01 
                                            ? "text-emerald-700 bg-emerald-50/20" 
                                            : bal < -0.01 
                                              ? "text-rose-700 bg-rose-50/20" 
                                              : "text-slate-500"
                                        }`}>
                                          {bal > 0 ? "Receivable +" : bal < 0 ? "Owes " : ""}
                                          {Math.abs(bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Section 4: Recommended Settlements */}
                            <div className="space-y-2 text-left bg-slate-50 p-4.5 rounded-xl border border-slate-200">
                              <h3 className="text-xs font-black uppercase text-slate-805 border-b border-slate-300 pb-1.5 tracking-wider flex items-center gap-1.5 font-mono">
                                <Coins className="size-4 text-emerald-600 no-print" /> 5. Required Settlement Transfers
                              </h3>
                              {settlements.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No transfers are necessary. Out-of-pocket funding balances match the divided target shares!</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {settlements.map((tx, index) => (
                                    <div key={index} className="text-xs flex justify-between items-center bg-white border border-slate-150 px-3 py-1.5 rounded-md">
                                      <span className="text-slate-700">
                                        👉 <strong className="text-slate-900">{tx.from}</strong> pays directly to <strong className="text-slate-900">{tx.to}</strong>
                                      </span>
                                      <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                        LKR {tx.amount.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Controls for Interactive Overlay Screen (Hidden on physical page print) */}
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-200 no-print">
                            <span className="text-[10px] text-slate-450 italic select-none">
                              🖨️ Pro-tip: Standard printing hides system buttons, margins, and sidebars automatically.
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowPrintModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-250/70 transition-all cursor-pointer"
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPrintModal(false);
                                  handleExportCSV();
                                }}
                                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-250/60 text-slate-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Download className="size-3.5" />
                                Export CSV
                              </button>
                              <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <Printer className="size-3.5" />
                                Print Document
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        )}

        {workspaceTab === "subsystems" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Box A: Permanent Allocated components list */}
            <div id="allocated-hardware-box" className="text-left flex flex-col space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200/55 pb-2">
                <h4 className="text-xs font-bold font-display text-slate-800 tracking-wider flex items-center gap-1 uppercase">
                  <FileCheck className="size-4 text-emerald-500" /> Active Soldered Parts Checkouts
                </h4>
                {canModifyProject(selectedProject) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInventoryItemId("");
                      setAllocationQty(1);
                      setShowAddHardwareModal(true);
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <Plus className="size-3" /> Checkout Allocation
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Hardwired parts allocated and soldered to the physical testbed platform. Managed through Central Stockroom Inventory.
              </p>

              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1 mt-2">
                {allocatedHardware.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-[10px] italic border border-dashed border-slate-200/60 bg-white rounded-lg">
                    No parts checked out to this workstation yet. Allocate stock parts below to solder them to this build shield!
                  </div>
                ) : (
                  allocatedHardware.map((hw) => (
                    <div key={hw.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-slate-350 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{hw.name}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded border border-slate-200">
                            Quantity: {hw.quantity}
                          </span>
                          {canModifyProject(selectedProject) && (
                            <button
                              type="button"
                              onClick={() => handleDeallocateClick(hw)}
                              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-red-505 transition-colors cursor-pointer border border-transparent hover:border-red-100"
                              title="Return parts to stock"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-sans mt-2 pt-1 border-t border-slate-50">
                        <span>Authorized by: <strong>{hw.allocatedByName}</strong></span>
                        <span>Date: {new Date(hw.allocatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instruction Manual / Information card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3 shrink-0">
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Subassembly Soldering Workbench Rules</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                When building robotic circuits, allocate elements from the Central Stockroom system so that available supply is accurately detracted. Deallocating returns stock capacity seamlessly.
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-2 text-[10px]">
                <p className="font-semibold text-slate-700">✓ Solder & Assembly checklist:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[9px]">
                  <li>Verify capacitance limits before applying power</li>
                  <li>Perform passive continuity tests on custom prototype shields</li>
                  <li>Document allocated pins in the engineering log</li>
                </ul>
              </div>
            </div>

          </div>
        )}

        {workspaceTab === "logs" && (
          <div className="space-y-4">
            
            {/* Box B: Project Update Logs */}
            <div id="project-logs-box" className="flex flex-col justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[350px]">
              <div className="flex flex-col space-y-2 mb-3 border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold font-display text-slate-800 tracking-wider flex items-center gap-1 uppercase">
                  <NotebookPen className="size-4 text-indigo-600" /> Engineering Reports & Progress Logs
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Append fabrication milestones, pin declarations, logic revisions, or flight controller test reports.
                </p>
              </div>

              {/* Logs feed list */}
              <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 mt-2 pr-1 text-left">
                {projectLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-[10px] italic border border-dashed border-slate-200/50 bg-white rounded-lg">
                    No engineering log reports submitted. Draft the first subassembly report below!
                  </div>
                ) : (
                  projectLogs.map((log) => (
                    <div key={log.id} className="bg-white p-3.5 rounded-xl border border-slate-200 text-[11px] leading-relaxed relative hover:border-slate-350 transition-colors">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mb-1.5 pb-1 border-b border-slate-50">
                        <span className="font-sans font-extrabold text-slate-650">{log.authorName}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-705 text-xs whitespace-pre-wrap leading-normal font-sans">{log.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Log submit form */}
              {selectedProject.status !== "Finished" || isAdmin ? (
                <form onSubmit={handleAddLog} className="mt-4 flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-xs rounded-lg px-3 py-2 outline-hidden border-0 ring-0 focus:ring-0 placeholder:text-slate-400 focus:outline-hidden"
                    placeholder="Describe project tasks, soldering shield connections, or driver firmware updates..."
                    value={newLogContent}
                    onChange={(e) => setNewLogContent(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!newLogContent.trim()}
                    className="p-1 px-4 text-xs bg-slate-900 hover:bg-indigo-600 disabled:hover:bg-slate-900 text-white rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider h-8"
                  >
                    Post Report
                  </button>
                </form>
              ) : (
                <div className="mt-4 p-2 bg-slate-100 border border-slate-200 rounded-lg text-center text-[10px] italic text-slate-400 flex items-center justify-center gap-1.5">
                  <Lock className="size-3" /> Log database is locked. Completed project documentation is preserved for audit.
                </div>
              )}
            </div>

          </div>
        )}

      </div>
          </>
        )}



      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div id="create-project-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Initiate New Robotics Project</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Title</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  placeholder="e.g., v2 Autonomous Arm Chassis"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Technical Scope Description</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  rows={3}
                  placeholder="Summarize mechanical frame construction, controller pin interfaces, or visual filters applied..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Leader</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2 py-2 text-xs outline-hidden cursor-pointer"
                    value={newLeaderId}
                    onChange={(e) => setNewLeaderId(e.target.value)}
                  >
                    <option value="">Select Lead...</option>
                    {roster.map((u) => (
                      <option key={u.uid} value={u.uid}>{u.displayName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Started Date (Optional)</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Target Deadline (Optional)</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                  />
                </div>
              </div>

              {/* Tag/Assign team members */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Assign Team Roster</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto border border-slate-100 p-2.5 rounded-lg bg-slate-50/50">
                  {roster.map((u) => {
                    const isSelected = newMemberIds.includes(u.uid);
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewMemberIds(newMemberIds.filter(id => id !== u.uid));
                          } else {
                            setNewMemberIds([...newMemberIds, u.uid]);
                          }
                        }}
                        className={`text-left text-[11px] p-2 rounded-md border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-50/75 border-blue-250 text-blue-800 font-medium" 
                            : "bg-white border-slate-200/70 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <span className="truncate">{u.displayName}</span>
                        {isSelected && <Check className="size-3 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Financial Control */}
              <div className="border-t border-slate-100 pt-3 space-y-3 text-left">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Budgeting</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Project Budget (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                      placeholder="e.g. 1500"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated Project Cost (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                      placeholder="e.g. 1000"
                      value={newEstimatedCost}
                      onChange={(e) => setNewEstimatedCost(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Cost Division Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCostSplitType("equal")}
                      className={`text-xs py-2 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        newCostSplitType === "equal"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCostSplitType("custom")}
                      className={`text-xs py-2 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        newCostSplitType === "custom"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Custom Split
                    </button>
                  </div>
                </div>

                {newCostSplitType === "custom" && (
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Individual Shares (LKR)</span>
                      <span className={`text-[10px] font-mono font-bold ${
                        Math.abs(Object.values(newMemberCostSplits).reduce((a, b) => a + b, 0) - (parseFloat(newEstimatedCost) || 0)) < 0.01
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        Sum: LKR {Object.values(newMemberCostSplits).reduce((a, b) => a + b, 0).toFixed(2)} / ${(parseFloat(newEstimatedCost) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {Array.from(new Set([newLeaderId, ...newMemberIds])).filter(Boolean).map((uid) => {
                        const matchedU = roster.find(u => u.uid === uid) || (uid === currentUser.uid ? currentUser : null);
                        if (!matchedU) return null;
                        const userVal = newMemberCostSplits[uid] || 0;
                        return (
                          <div key={uid} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-slate-650 flex items-center gap-1">
                              {matchedU.displayName} 
                              {uid === newLeaderId && <span className="text-[8px] bg-blue-100 text-blue-800 px-1 rounded uppercase font-bold shrink-0">Lead</span>}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono text-slate-450 text-[10px]">LKR</span>
                              <input
                                  type="number"
                                  min={0}
                                  className="w-20 bg-white border border-slate-200 focus:border-blue-400 rounded-md px-2 py-1 text-xs text-right font-mono outline-hidden"
                                value={userVal || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setNewMemberCostSplits({
                                    ...newMemberCostSplits,
                                    [uid]: val
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg shadow-sm shadow-slate-900/10 cursor-pointer"
                >
                  {loading ? "Creating..." : "Launch Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {showEditModal && selectedProject && (
        <div id="edit-project-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Edit Project Settings</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  placeholder="e.g., v2 Autonomous Arm Chassis"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Technical Scope Description</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  rows={3}
                  placeholder="Summarize frame construction, interfaces, or target criteria..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Leader</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2 py-2 text-xs outline-hidden cursor-pointer"
                    value={editLeaderId}
                    onChange={(e) => setEditLeaderId(e.target.value)}
                  >
                    <option value="">Select Lead...</option>
                    {roster.map((u) => (
                      <option key={u.uid} value={u.uid}>{u.displayName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Started Date (Optional)</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Target Deadline (Optional)</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />
                </div>
              </div>

              {/* Tag/Assign team members */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Assign Team Roster</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto border border-slate-100 p-2.5 rounded-lg bg-slate-50/50">
                  {roster.map((u) => {
                    const isSelected = editMemberIds.includes(u.uid);
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditMemberIds(editMemberIds.filter(id => id !== u.uid));
                          } else {
                            setEditMemberIds([...editMemberIds, u.uid]);
                          }
                        }}
                        className={`text-left text-[11px] p-2 rounded-md border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-550/10 border-blue-200 text-blue-800 font-medium" 
                            : "bg-white border-slate-200/70 hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        <span className="truncate">{u.displayName}</span>
                        {isSelected && <Check className="size-3 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Edit Budget Control */}
              <div className="border-t border-slate-100 pt-3 space-y-3 text-left">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Budgeting</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Project Budget (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                      placeholder="e.g. 1500"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated Project Cost (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                      placeholder="e.g. 1000"
                      value={editEstimatedCost}
                      onChange={(e) => setEditEstimatedCost(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Cost Division Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCostSplitType("equal")}
                      className={`text-xs py-2 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        editCostSplitType === "equal"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCostSplitType("custom")}
                      className={`text-xs py-2 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        editCostSplitType === "custom"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Custom Split
                    </button>
                  </div>
                </div>

                {editCostSplitType === "custom" && (
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Individual Shares (LKR)</span>
                      <span className={`text-[10px] font-mono font-bold ${
                        Math.abs(Object.values(newMemberCostSplits).reduce((a, b) => a + b, 0) - (parseFloat(newEstimatedCost) || 0)) < 0.01
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        Sum: LKR {Object.values(newMemberCostSplits).reduce((a, b) => a + b, 0).toFixed(2)} / ${(parseFloat(newEstimatedCost) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {Array.from(new Set([newLeaderId, ...newMemberIds])).filter(Boolean).map((uid) => {
                        const matchedU = roster.find(u => u.uid === uid) || (uid === currentUser.uid ? currentUser : null);
                        if (!matchedU) return null;
                        const userVal = newMemberCostSplits[uid] || 0;
                        return (
                          <div key={uid} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-slate-655 flex items-center gap-1">
                              {matchedU.displayName} 
                              {uid === newLeaderId && <span className="text-[8px] bg-blue-100 text-blue-800 px-1 rounded uppercase font-bold shrink-0">Lead</span>}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono text-slate-450 text-[10px]">LKR</span>
                              <input
                                  type="number"
                                  min={0}
                                  className="w-20 bg-white border border-slate-205 focus:border-blue-400 rounded-md px-2 py-1 text-xs text-right font-mono outline-hidden"
                                value={userVal || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditMemberCostSplits({
                                    ...editMemberCostSplits,
                                    [uid]: val
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  {loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Project Deletion Confirmation Overlay */}
      {deleteConfirmProjId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full mx-4 shadow-xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  Delete Project and Hardware?
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Are you absolutely sure you want to delete this project? This will permanently erase the specifications, timeline, subcollection hardware mappings, and telemetry progress logs. This is destructive and irreversible.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProjId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                id="cancel-delete-proj-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProject}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                id="confirm-delete-proj-btn"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT ADD HARDWARE MODAL */}
      {showAddHardwareModal && selectedProject && (
        <div id="add-hardware-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <FileCheck className="size-4 text-blue-400" /> Allocate Stock Component
              </h3>
              <button 
                onClick={() => setShowAddHardwareModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                id="close-add-hw-modal-btn"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAllocateHardware} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Select Component from Stockroom Catalog
                </label>
                <select
                  required
                  id="allocate-stock-item-select"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-2.5 text-xs outline-hidden cursor-pointer"
                  value={selectedInventoryItemId}
                  onChange={(e) => {
                    setSelectedInventoryItemId(e.target.value);
                    setAllocationQty(1);
                  }}
                >
                  <option value="">-- Choose Component --</option>
                  {allItemsList.map((item) => {
                    const isAvailable = item.availableQuantity > 0;
                    return (
                      <option 
                        key={item.id} 
                        value={item.id}
                        disabled={!isAvailable}
                      >
                        {item.name} ({item.category}) - {item.availableQuantity} available {!isAvailable ? '[OUT OF STOCK]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedInventoryItemId && (
                <div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg mb-4 text-slate-600 text-xs leading-normal">
                    {(() => {
                      const matched = allItemsList.find(i => i.id === selectedInventoryItemId);
                      if (!matched) return null;
                      return (
                        <>
                          <div className="font-semibold text-slate-850 mb-0.5">{matched.name}</div>
                          <div className="text-[11px] text-slate-500">Location: {matched.location || "N/A"}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{matched.description || "No description provided."}</div>
                        </>
                      );
                    })()}
                  </div>

                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Allocation Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={allItemsList.find(i => i.id === selectedInventoryItemId)?.availableQuantity || 1}
                    id="allocate-qty-input"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden"
                    value={allocationQty}
                    onChange={(e) => setAllocationQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddHardwareModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                  id="cancel-allocate-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHw || !selectedInventoryItemId}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  id="submit-allocate-btn"
                >
                  {submittingHw ? "Allocating..." : "Allocate Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE/RETURN HARDWARE MODAL */}
      {showRemoveHwModal && clickedHwItem && (
        <div id="remove-hardware-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-fade-in text-left">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-display text-xs font-bold leading-none">
                De-allocate / Return Part
              </h3>
              <button 
                onClick={() => {
                  setShowRemoveHwModal(false);
                  setClickedHwItem(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
                id="close-remove-hw-modal-btn"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handlePerformDeallocate} className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-normal">
                You are removing <strong>{clickedHwItem.name}</strong> from this build. They will be returned back to the Stockroom Inventory master stock.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Quantity to Return (Max {clickedHwItem.quantity})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={clickedHwItem.quantity}
                  id="remove-qty-input"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden font-mono"
                  value={removeQty}
                  onChange={(e) => setRemoveQty(Math.min(clickedHwItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveHwModal(false);
                    setClickedHwItem(null);
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                  id="cancel-remove-hw-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHw}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
                  id="submit-remove-hw-btn"
                >
                  {submittingHw ? "De-allocating..." : "Return Components"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedProjectIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4 max-w-xl w-[90%] font-sans"
          >
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-blue-600 text-white font-bold text-xs size-6 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                {selectedProjectIds.length}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-100">Projects Selected</p>
                <p className="text-[10px] text-slate-400">Apply batch status changes or deletion.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end ml-auto">
              {/* Batch Status Update Select Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-700 w-full sm:w-auto">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Status:</span>
                <select
                  aria-label="Bulk update project status"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusUpdate(e.target.value as ProjectStatus);
                    }
                  }}
                  disabled={isBulkProcessing}
                  className="bg-transparent border-0 text-xs font-semibold text-white focus:ring-0 outline-hidden cursor-pointer"
                >
                  <option value="" className="text-slate-900">Change to...</option>
                  <option value="Planning" className="text-slate-900">Planning</option>
                  <option value="Fabricating" className="text-slate-900">Fabricating</option>
                  <option value="Testing" className="text-slate-900">Testing</option>
                  <option value="Continuous" className="text-slate-900">Continuous Development</option>
                  <option value="Finished" className="text-slate-900">Finished Archive 🔒</option>
                </select>
              </div>

              {/* Batch Delete Button */}
              <button
                type="button"
                id="bulk-delete-action-btn"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkProcessing}
                className="px-3.5 py-1.5 bg-red-600/90 hover:bg-red-700 border border-red-500/30 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>

              {/* Exit selection */}
              <button
                type="button"
                id="bulk-close-selected-btn"
                onClick={() => setSelectedProjectIds([])}
                className="p-1.5 px-2 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            
            {/* Action Feedback Notifications */}
            <AnimatePresence>
              {(bulkActionSuccess || bulkActionError) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute -top-12 left-0 right-0 p-2.5 rounded-xl text-center text-xs font-semibold border ${
                    bulkActionSuccess
                      ? "bg-emerald-950/95 border-emerald-800 text-emerald-300"
                      : "bg-red-950/95 border-red-800 text-red-350"
                  }`}
                >
                  {bulkActionSuccess || bulkActionError}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirm Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowBulkDeleteConfirm(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-2">Delete Multiple Projects?</h3>
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you absolutely sure you want to delete {selectedProjectIds.length} projects? This action cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkDeleteConfirm(false);
                  handleBulkDelete();
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-transparent shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
