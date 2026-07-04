import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { 
  Search, 
  Filter, 
  Plus, 
  Wrench, 
  ShoppingBag, 
  Check, 
  PackageCheck, 
  AlertCircle, 
  ArrowRightLeft,
  X,
  Layers,
  MapPin,
  FileSpreadsheet,
  Cpu,
  Trash2
} from "lucide-react";
import { InventoryItem, Project, UserProfile, AllocatedHardware, ProjectLog } from "../types";

const getSpecPoints = (spec: string): string[] => {
  if (!spec) return [];
  let parts: string[] = [];
  if (spec.includes('\n')) {
    parts = spec.split('\n');
  } else if (spec.includes(';')) {
    parts = spec.split(';');
  } else if (spec.includes(',')) {
    parts = spec.split(',');
  } else {
    parts = [spec];
  }
  return parts
    .map(p => p.trim())
    .map(p => p.replace(/^[•\-\*\s]+/, '').trim())
    .filter(Boolean);
};

interface InventoryManagerProps {
  currentUser: UserProfile;
  projects: Project[];
}

export default function InventoryManager({ currentUser, projects }: InventoryManagerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Checkout drawer state
  const [checkoutItem, setCheckoutItem] = useState<InventoryItem | null>(null);
  const [checkoutProjectId, setCheckoutProjectId] = useState("");
  const [checkoutQty, setCheckoutQty] = useState(1);
  
  // Admin-Only Salvage Workbench state
  const [showSalvagePanel, setShowSalvagePanel] = useState(false);
  const [salvageProjectId, setSalvageProjectId] = useState("");
  const [projectHardwareList, setProjectHardwareList] = useState<AllocatedHardware[]>([]);
  const [selectedSalvageHardware, setSelectedSalvageHardware] = useState<AllocatedHardware | null>(null);
  const [salvageQty, setSalvageQty] = useState(1);
  
  // Registration state (any member can add items)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("Microcontrollers");
  const [newTotalQty, setNewTotalQty] = useState(10);
  const [newLoc, setNewLoc] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [mergeExisting, setMergeExisting] = useState(true);

  // Edit stock item state (any registered member/admin can edit catalog details or add stock)
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("Microcontrollers");
  const [editTotalQty, setEditTotalQty] = useState(10);
  const [editAvailQty, setEditAvailQty] = useState(10);
  const [editLoc, setEditLoc] = useState("");
  const [editSpec, setEditSpec] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>(["Microcontrollers", "Mechanical", "Sensors", "Energy & Power", "Raw Materials"]);

  // Stream categories dynamically
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadMockCategories = () => {
        const stored = localStorage.getItem("axotic_mock_categories");
        if (stored) {
          try {
            setCategories(JSON.parse(stored));
          } catch (_) {}
        }
      };
      loadMockCategories();
      window.addEventListener("axotic_db_update", loadMockCategories);
      return () => window.removeEventListener("axotic_db_update", loadMockCategories);
    } else {
      const unsub = onSnapshot(collection(db, "categories"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            if (d.data().name) list.push(d.data().name);
          });
          setCategories(Array.from(new Set(list)));
        }
      }, (err) => {
        console.warn("Could not stream categories dynamically", err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.LIST, "categories");
      });
      return () => unsub();
    }
  }, [currentUser?.isOfflineMock]);

  // Set default category when categories list changes
  useEffect(() => {
    if (categories.length > 0) {
      if (!categories.includes(newCat)) setNewCat(categories[0]);
      if (!categories.includes(editCat)) setEditCat(categories[0]);
    }
  }, [categories]);

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 6000);
  };

  const isAdmin = currentUser.role === "admin";

  // Stream general stockroom inventory
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      const loadLocalInventory = () => {
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          try {
            setInventory(JSON.parse(stored));
          } catch (_) {
            setInventory([]);
          }
        } else {
          // Default initial inventory seed
          const defaultInventory: InventoryItem[] = [
            {
              id: "inv-esp32",
              name: "ESP32-WROOM-32E Dev Board",
              category: "Microcontrollers",
              description: "Dual-core Wi-Fi & Bluetooth microcontroller node for high-frequency navigation signals.",
              totalQuantity: 25,
              availableQuantity: 21,
              location: "Cabinet A-4",
              specification: "ESP32-D0WDQ6-V3, 3.3V power node"
            },
            {
              id: "inv-imu",
              name: "MPU6050 6-Axis Accelerometer/Gyroscope",
              category: "Sensors",
              description: "High precision inertial measurement unit for orientation tracking, SLAM feedback.",
              totalQuantity: 15,
              availableQuantity: 15,
              location: "Drawer B-1",
              specification: "I2C interface, 3-5V input tolerency"
            },
            {
              id: "inv-motor",
              name: "NEMA 17 Stepper Motor High Torque",
              category: "Hardware",
              description: "High durability drivetrain locomotion node. Integrates directly with motor control shields.",
              totalQuantity: 30,
              availableQuantity: 28,
              location: "Bay C-2",
              specification: "1.8 deg/step, 1.5A rating"
            }
          ];
          localStorage.setItem("axotic_mock_inventory", JSON.stringify(defaultInventory));
          setInventory(defaultInventory);
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
      setInventory(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "inventory");
    });
    return () => unsubscribe();
  }, [currentUser?.isOfflineMock]);

  // When admin selects a project for salvaging, stream its allocated hardware
  useEffect(() => {
    if (!salvageProjectId) {
      setProjectHardwareList([]);
      setSelectedSalvageHardware(null);
      return;
    }

    if (currentUser.isOfflineMock) {
      const loadLocalSalvageHw = () => {
        const hwKey = `axotic_mock_hardware_${salvageProjectId}`;
        const stored = localStorage.getItem(hwKey);
        if (stored) {
          try {
            const hwList = JSON.parse(stored);
            setProjectHardwareList(hwList);
            if (hwList.length > 0) {
              setSelectedSalvageHardware(hwList[0]);
            } else {
              setSelectedSalvageHardware(null);
            }
          } catch (_) {
            setProjectHardwareList([]);
            setSelectedSalvageHardware(null);
          }
        } else {
          setProjectHardwareList([]);
          setSelectedSalvageHardware(null);
        }
      };
      loadLocalSalvageHw();
      window.addEventListener("axotic_db_update", loadLocalSalvageHw);
      return () => window.removeEventListener("axotic_db_update", loadLocalSalvageHw);
    }

    const hwQuery = collection(db, "projects", salvageProjectId, "hardware");
    const unsubscribe = onSnapshot(hwQuery, (snapshot) => {
      const hwList: AllocatedHardware[] = [];
      snapshot.forEach((docSnap) => {
        hwList.push({ id: docSnap.id, ...docSnap.data() } as AllocatedHardware);
      });
      setProjectHardwareList(hwList);
      if (hwList.length > 0) {
        setSelectedSalvageHardware(hwList[0]);
      } else {
        setSelectedSalvageHardware(null);
      }
    }, (err) => {
      console.warn("Could not load hardware for salvage. Standard write guidelines apply.", err instanceof Error ? err.message : String(err));
      handleFirestoreError(err, OperationType.LIST, `projects/${salvageProjectId}/hardware`);
    });

    return () => unsubscribe();
  }, [salvageProjectId, currentUser?.isOfflineMock]);

  // Handle addition of standard items
  const handleRegisterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newTotalQty < 0) return;

    const trimmedName = newName.trim();
    const matchedItem = inventory.find(
      i => i.name.toLowerCase().trim() === trimmedName.toLowerCase().trim()
    );

    if (matchedItem && mergeExisting) {
      if (currentUser.isOfflineMock) {
        setLoading(true);
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          const invList: InventoryItem[] = JSON.parse(stored);
          const idx = invList.findIndex(item => item.id === matchedItem.id);
          if (idx !== -1) {
            invList[idx] = {
              ...invList[idx],
              totalQuantity: invList[idx].totalQuantity + Number(newTotalQty),
              availableQuantity: invList[idx].availableQuantity + Number(newTotalQty),
              description: newDesc.trim() || invList[idx].description,
              location: newLoc.trim() || invList[idx].location,
              specification: newSpec.trim() || invList[idx].specification,
            };
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
            window.dispatchEvent(new Event("axotic_db_update"));

            setShowAddModal(false);
            setNewName("");
            setNewDesc("");
            setNewTotalQty(10);
            setNewLoc("");
            setNewSpec("");
            triggerFeedback(`Successfully added ${newTotalQty} units to existing component "${matchedItem.name}".`);
            setLoading(false);
            return;
          }
        }
      }

      // Live mode
      try {
        setLoading(true);
        const itemRef = doc(db, "inventory", matchedItem.id);
        await updateDoc(itemRef, {
          totalQuantity: matchedItem.totalQuantity + Number(newTotalQty),
          availableQuantity: matchedItem.availableQuantity + Number(newTotalQty),
          description: newDesc.trim() || matchedItem.description,
          location: newLoc.trim() || matchedItem.location,
          specification: newSpec.trim() || matchedItem.specification,
        });

        setShowAddModal(false);
        setNewName("");
        setNewDesc("");
        setNewTotalQty(10);
        setNewLoc("");
        setNewSpec("");
        triggerFeedback(`Successfully added ${newTotalQty} units to existing component "${matchedItem.name}".`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${matchedItem.id}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    const payload: Omit<InventoryItem, "id"> = {
      name: trimmedName,
      category: newCat,
      description: newDesc.trim(),
      totalQuantity: Number(newTotalQty),
      availableQuantity: Number(newTotalQty), // fully available initially
      location: newLoc.trim() || "Unassigned Bay",
      specification: newSpec.trim()
    };

    if (currentUser.isOfflineMock) {
      setLoading(true);
      const stored = localStorage.getItem("axotic_mock_inventory");
      const currentInv: InventoryItem[] = stored ? JSON.parse(stored) : [];
      const newInvItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        ...payload
      };
      localStorage.setItem("axotic_mock_inventory", JSON.stringify([newInvItem, ...currentInv]));
      window.dispatchEvent(new Event("axotic_db_update"));

      setShowAddModal(false);
      setNewName("");
      setNewDesc("");
      setNewTotalQty(10);
      setNewLoc("");
      setNewSpec("");
      triggerFeedback("New hardware component successfully registered in Sandbox.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "inventory"), payload);
      
      setShowAddModal(false);
      setNewName("");
      setNewDesc("");
      setNewTotalQty(10);
      setNewLoc("");
      setNewSpec("");
      triggerFeedback("New hardware component successfully registered.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDesc(item.description || "");
    setEditCat(item.category);
    setEditTotalQty(item.totalQuantity);
    setEditAvailQty(item.availableQuantity);
    setEditLoc(item.location || "");
    setEditSpec(item.specification || "");
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    if (editAvailQty > editTotalQty) {
      triggerError("Error: Available quantity cannot exceed total quantity.");
      return;
    }

    const payload: Partial<InventoryItem> = {
      name: editName.trim(),
      description: editDesc.trim(),
      category: editCat,
      totalQuantity: Number(editTotalQty),
      availableQuantity: Number(editAvailQty),
      location: editLoc.trim() || "Unassigned Bay",
      specification: editSpec.trim()
    };

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          const invList: InventoryItem[] = JSON.parse(stored);
          const idx = invList.findIndex(item => item.id === editingItem.id);
          if (idx !== -1) {
            invList[idx] = {
              ...invList[idx],
              ...payload
            };
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
            window.dispatchEvent(new Event("axotic_db_update"));
            triggerFeedback(`Updated catalog details for ${editName}.`);
            setShowEditItemModal(false);
          }
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Live mode
    try {
      setLoading(true);
      const itemRef = doc(db, "inventory", editingItem.id);
      await updateDoc(itemRef, payload);
      triggerFeedback(`Updated catalog details for ${editName}.`);
      setShowEditItemModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `inventory/${editingItem.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCatalogItem = async (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);
        const stored = localStorage.getItem("axotic_mock_inventory");
        if (stored) {
          const invList: InventoryItem[] = JSON.parse(stored);
          const filtered = invList.filter(i => i.id !== itemId);
          localStorage.setItem("axotic_mock_inventory", JSON.stringify(filtered));
          window.dispatchEvent(new Event("axotic_db_update"));
          triggerFeedback(`Successfully removed ${item.name} from stockroom catalog.`);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setDeleteConfirmItemId(null);
      }
      return;
    }

    // Live mode
    try {
      setLoading(true);
      const itemRef = doc(db, "inventory", itemId);
      await deleteDoc(itemRef);
      triggerFeedback(`Successfully removed ${item.name} from stockroom catalog.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${itemId}`);
    } finally {
      setLoading(false);
      setDeleteConfirmItemId(null);
    }
  };

  // Perform checkout allocation
  const handlePerformAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutItem || !checkoutProjectId || checkoutQty <= 0) return;

    if (checkoutQty > checkoutItem.availableQuantity) {
      triggerError("Error: Insufficient stock room quantity. Reduce allocation amount.");
      return;
    }

    const selectedProj = projects.find(p => p.id === checkoutProjectId);
    if (!selectedProj) return;

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);

        // 1. Deduct count in Inventory
        const storedInv = localStorage.getItem("axotic_mock_inventory");
        if (storedInv) {
          const invList: InventoryItem[] = JSON.parse(storedInv);
          const iIdx = invList.findIndex(item => item.id === checkoutItem.id);
          if (iIdx !== -1) {
            invList[iIdx].availableQuantity = invList[iIdx].availableQuantity - checkoutQty;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
          }
        }

        // 2. Append to project allocated hardware Subcollection
        const hwKey = `axotic_mock_hardware_${checkoutProjectId}`;
        const storedHw = localStorage.getItem(hwKey);
        const hwList: AllocatedHardware[] = storedHw ? JSON.parse(storedHw) : [];
        const hwIdx = hwList.findIndex(hw => hw.id === checkoutItem.id);
        
        if (hwIdx !== -1) {
          hwList[hwIdx].quantity = hwList[hwIdx].quantity + checkoutQty;
          hwList[hwIdx].allocatedAt = new Date().toISOString();
        } else {
          const payload: AllocatedHardware = {
            id: checkoutItem.id,
            name: checkoutItem.name,
            category: checkoutItem.category,
            quantity: checkoutQty,
            allocatedBy: currentUser.uid,
            allocatedByName: currentUser.displayName,
            allocatedAt: new Date().toISOString()
          };
          hwList.push(payload);
        }
        localStorage.setItem(hwKey, JSON.stringify(hwList));

        // 3. Append manual allocation log in project
        const logsKey = `axotic_mock_logs_${checkoutProjectId}`;
        const storedLogs = localStorage.getItem(logsKey);
        const logsList: ProjectLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog: ProjectLog = {
          id: `mock-log-${Date.now()}`,
          projectId: checkoutProjectId,
          content: `ALLOCATION: Checked out x${checkoutQty} ${checkoutItem.name} onto build substrate.`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };
        logsList.unshift(newLog);
        localStorage.setItem(logsKey, JSON.stringify(logsList));

        window.dispatchEvent(new Event("axotic_db_update"));

        setCheckoutItem(null);
        setCheckoutQty(1);
        triggerFeedback(`Allocated x${checkoutQty} ${checkoutItem.name} directly to ${selectedProj.title}.`);
      } catch (err) {
        console.error("Local allocation error", err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      // 1. Deduct count in Inventory
      const inventoryRef = doc(db, "inventory", checkoutItem.id);
      await updateDoc(inventoryRef, {
        availableQuantity: checkoutItem.availableQuantity - checkoutQty
      });

      // 2. Append to project allocated hardware subcollection
      const projectHwRef = doc(db, "projects", checkoutProjectId, "hardware", checkoutItem.id);
      const docSnap = await getDoc(projectHwRef);
      
      if (docSnap.exists()) {
        const existingData = docSnap.data();
        await updateDoc(projectHwRef, {
          quantity: existingData.quantity + checkoutQty,
          allocatedAt: new Date().toISOString()
        });
      } else {
        const payload: AllocatedHardware = {
          id: checkoutItem.id,
          name: checkoutItem.name,
          category: checkoutItem.category,
          quantity: checkoutQty,
          allocatedBy: currentUser.uid,
          allocatedByName: currentUser.displayName,
          allocatedAt: new Date().toISOString()
        };
        await setDoc(projectHwRef, payload);
      }

      // Add a status system-log automatically to that project
      const logRef = collection(db, "projects", checkoutProjectId, "logs");
      await addDoc(logRef, {
        projectId: checkoutProjectId,
        content: `ALLOCATION: Checked out x${checkoutQty} ${checkoutItem.name} onto build substrate.`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      setCheckoutItem(null);
      setCheckoutQty(1);
      triggerFeedback(`Allocated x${checkoutQty} ${checkoutItem.name} directly to ${selectedProj.title}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${checkoutProjectId}/hardware`);
    } finally {
      setLoading(false);
    }
  };

  // Admin-Only Component Salvaging / Transfer Workshop
  const handlePerformSalvage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salvageProjectId || !selectedSalvageHardware || salvageQty <= 0) return;

    if (salvageQty > selectedSalvageHardware.quantity) {
      triggerError("Error: Cannot salvage more than what is allocated.");
      return;
    }

    if (currentUser.isOfflineMock) {
      try {
        setLoading(true);

        // 1. Feed count back to Inventory
        const storedInv = localStorage.getItem("axotic_mock_inventory");
        if (storedInv) {
          const invList: InventoryItem[] = JSON.parse(storedInv);
          const iIdx = invList.findIndex(item => item.id === selectedSalvageHardware.id);
          if (iIdx !== -1) {
            invList[iIdx].availableQuantity = invList[iIdx].availableQuantity + salvageQty;
            localStorage.setItem("axotic_mock_inventory", JSON.stringify(invList));
          }
        }

        // 2. Reduce or strip subcollection project-hardware records
        const hwKey = `axotic_mock_hardware_${salvageProjectId}`;
        const storedHw = localStorage.getItem(hwKey);
        if (storedHw) {
          let hwList: AllocatedHardware[] = JSON.parse(storedHw);
          const hwIdx = hwList.findIndex(hw => hw.id === selectedSalvageHardware.id);
          if (hwIdx !== -1) {
            if (salvageQty === selectedSalvageHardware.quantity) {
              hwList = hwList.filter(hw => hw.id !== selectedSalvageHardware.id);
            } else {
              hwList[hwIdx].quantity = hwList[hwIdx].quantity - salvageQty;
            }
            localStorage.setItem(hwKey, JSON.stringify(hwList));
          }
        }

        // 3. Append manual salvage log in the workspace
        const logsKey = `axotic_mock_logs_${salvageProjectId}`;
        const storedLogs = localStorage.getItem(logsKey);
        const logsList: ProjectLog[] = storedLogs ? JSON.parse(storedLogs) : [];
        const newLog: ProjectLog = {
          id: `mock-log-${Date.now()}`,
          projectId: salvageProjectId,
          content: `🔧 ADMIN SALVAGE: Salvaged/stripped x${salvageQty} ${selectedSalvageHardware.name} back to central stores.`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };
        logsList.unshift(newLog);
        localStorage.setItem(logsKey, JSON.stringify(logsList));

        window.dispatchEvent(new Event("axotic_db_update"));

        setSalvageProjectId("");
        triggerFeedback(`Successfully salvaged x${salvageQty} ${selectedSalvageHardware.name} components.`);
      } catch (err) {
        console.error("Local salvage error", err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      // 1. Feed count back to Inventory (if item still exists, else we can re-create or ignore, let's look up)
      const itemInventoryRef = doc(db, "inventory", selectedSalvageHardware.id);
      const invSnap = await getDoc(itemInventoryRef);
      
      if (invSnap.exists()) {
        const currentInv = invSnap.data() as InventoryItem;
        await updateDoc(itemInventoryRef, {
          availableQuantity: currentInv.availableQuantity + salvageQty
        });
      }

      // 2. Reduce or strip subcollection project-hardware records
      const projectHwRef = doc(db, "projects", salvageProjectId, "hardware", selectedSalvageHardware.id);
      if (salvageQty === selectedSalvageHardware.quantity) {
        await deleteDoc(projectHwRef);
      } else {
        await updateDoc(projectHwRef, {
          quantity: selectedSalvageHardware.quantity - salvageQty
        });
      }

      // 3. Append manual salvage log in the workspace
      const logRef = collection(db, "projects", salvageProjectId, "logs");
      await addDoc(logRef, {
        projectId: salvageProjectId,
        content: `🔧 ADMIN SALVAGE: Salvaged/stripped x${salvageQty} ${selectedSalvageHardware.name} back to central stores.`,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      setSalvageProjectId("");
      triggerFeedback(`Successfully salvaged x${salvageQty} ${selectedSalvageHardware.name} components.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${salvageProjectId}/hardware`);
    } finally {
      setLoading(false);
    }
  };

  const triggerFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 4500);
  };

  // Filter and search inventory items locally
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.specification.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="inventory-manager-layout" className="space-y-8 w-full max-w-7xl mx-auto px-1 py-4">
      
      {/* Search Header Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-hidden placeholder:text-slate-400 transition-colors"
              placeholder="Search components (ESP32-S3, 5Vin, raw aluminum, IMU sensors)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="size-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 outline-hidden cursor-pointer hover:border-slate-300"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Salvage Switch */}
          <button
            onClick={() => setShowSalvagePanel(!showSalvagePanel)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showSalvagePanel 
                ? "bg-amber-100 border border-amber-300 text-amber-800" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            }`}
          >
            <Wrench className="size-4" /> Admin Salvaging
          </button>

          {/* New Item Register */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 hover:bg-blue-600 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="size-4" /> Register Part
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div id="inventory-feedback" className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-pulse">
          <PackageCheck className="size-4 text-emerald-600" /> {feedbackMsg}
        </div>
      )}

      {errorMsg && (
        <div id="inventory-error" className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 animate-pulse">
          <AlertCircle className="size-4 text-rose-600" /> {errorMsg}
        </div>
      )}

      {/* Advanced Component Salvaging Workbench (Collapsible Block) */}
      {showSalvagePanel && (
        <div id="salvage-workbench" className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/80 text-left space-y-4">
          <div className="flex items-start justify-between border-b border-amber-200 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-amber-900 flex items-center gap-1.5 uppercase">
                <Wrench className="size-4 text-amber-600" /> Component Salvaging & Scrap Deck
              </h3>
              <p className="text-[10px] text-amber-700 leading-relaxed font-sans">
                Admin Privilege: Since student builds aren't easily returnable, this tool overrides locks to strip parts off existing, retired, or finished chassis and inject them back into database stockrooms.
              </p>
            </div>
            {!isAdmin && (
              <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-100 text-[9px] font-bold rounded flex items-center gap-1 uppercase">
                <AlertCircle className="size-3" /> Locked to Admins Only
              </span>
            )}
          </div>

          {isAdmin ? (
            <form onSubmit={handlePerformSalvage} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-5 rounded-xl border border-amber-200/60 shadow-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Project</label>
                <select
                  required
                  value={salvageProjectId}
                  onChange={(e) => setSalvageProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.8 text-xs text-slate-700 cursor-pointer outline-hidden focus:border-blue-500"
                >
                  <option value="">Choose build...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Active Part</label>
                <select
                  required
                  disabled={projectHardwareList.length === 0}
                  onChange={(e) => {
                    const item = projectHardwareList.find(h => h.id === e.target.value);
                    setSelectedSalvageHardware(item || null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.8 text-xs text-slate-700 cursor-pointer outline-hidden disabled:opacity-50 focus:border-blue-500"
                >
                  {projectHardwareList.length === 0 ? (
                    <option value="">No parts allocated</option>
                  ) : (
                    projectHardwareList.map(h => (
                      <option key={h.id} value={h.id}>{h.name} (Qty: {h.quantity})</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity to Salvage</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={selectedSalvageHardware?.quantity || 1}
                    value={salvageQty}
                    onChange={(e) => setSalvageQty(Math.floor(Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">max: {selectedSalvageHardware?.quantity || 0}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={projectHardwareList.length === 0 || !selectedSalvageHardware}
                className="w-full py-2 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 outline-hidden transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <ArrowRightLeft className="size-4" /> Transfer to Catalog
              </button>
            </form>
          ) : (
            <div className="p-4 bg-white/50 text-slate-400 text-xs text-center border rounded-xl italic">
              Access Restricted. Please log in utilizing Genu's Admin Emulator card to test part-stripping & reclamation algorithms.
            </div>
          )}
        </div>
      )}

      {/* Live Catalog grid */}
      <section id="catalog-stock-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {filteredInventory.length === 0 ? (
          <div className="col-span-full bg-white border border-dashed border-slate-200 p-16 rounded-3xl text-center">
            <Cpu className="size-12 text-slate-300 mx-auto mb-4 animate-pulse" />
            <h3 className="font-display text-sm font-semibold text-slate-600">No Catalog Matches</h3>
            <p className="text-xs text-slate-400 mt-1">Refine your search parameters or register a new hardware unit above.</p>
          </div>
        ) : (
          filteredInventory.map((item) => (
            <div
              key={item.id}
              id={`catalog-item-${item.id}`}
              className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md uppercase tracking-wider font-mono">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                    <MapPin className="size-3" /> {item.location}
                  </span>
                </div>

                <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight leading-snug line-clamp-1">
                  {item.name}
                </h3>
                
                <p className="text-[11px] text-slate-500 leading-normal line-clamp-2 mt-1.5 min-h-[34px]">
                  {item.description || "Robotics stock material."}
                </p>

                {item.specification && (
                  <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] text-slate-500 font-mono max-h-[120px] overflow-y-auto">
                    <strong className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Technical Specs:</strong>
                    <ul className="space-y-1 list-none pl-0">
                      {getSpecPoints(item.specification).map((point, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-blue-500 text-[9px] select-none">▪</span>
                          <span className="leading-snug">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Stock room counts</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-bold text-slate-800 font-mono">
                      {item.availableQuantity}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">available</span>
                    <span className="text-[10px] text-slate-300">/</span>
                    <span className="text-[10px] text-slate-500 font-sans font-medium">
                      {item.totalQuantity} total
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-100 hover:border-blue-200/50 transition-all cursor-pointer"
                    title="Edit Item Details or Quantity"
                  >
                    <Wrench className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItemId(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-100 hover:border-rose-200/50 transition-all cursor-pointer"
                    title="Remove Item from Catalog"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setCheckoutItem(item)}
                    disabled={item.availableQuantity <= 0}
                    className="px-3.5 py-1.8 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-100 hover:border-blue-500 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="size-3.5" /> Allocate
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* CHECKOUT ALLOCATION DRAWER/MODAL */}
      {checkoutItem && (
        <div id="checkout-allocation-portal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl overflow-hidden text-left">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5 uppercase">
                <ShoppingBag className="size-4 text-blue-400 animate-bounce" /> Checkout Allocation Gate
              </h3>
              <button 
                onClick={() => setCheckoutItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handlePerformAllocation} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-0.5">{checkoutItem.category}</span>
                <h4 className="font-display font-bold text-slate-800 text-xs">{checkoutItem.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1">Available in Stockroom: <strong className="text-slate-700 font-mono">{checkoutItem.availableQuantity} units</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Quantity to Checkout</label>
                <input
                  type="number"
                  min={1}
                  max={checkoutItem.availableQuantity}
                  value={checkoutQty}
                  onChange={(e) => setCheckoutQty(Math.floor(Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Assign permanently to Project:</label>
                <select
                  required
                  value={checkoutProjectId}
                  onChange={(e) => setCheckoutProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-3 py-2 outline-hidden cursor-pointer"
                >
                  <option value="">Select Project...</option>
                  {projects.filter(p => p.status !== "Finished").map((p) => (
                    <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 leading-normal mt-1.5">
                  Allocation instantly discounts counts from central storage and binds the hardware to the selected project's build materials, creating a synchronous logged activity log.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCheckoutItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Verify checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER ITEM MODAL */}
      {showAddModal && (
        <div id="register-hardware-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl text-left overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Register Hardware Component</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-S3 (Dual-core, 5Vin Pin)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />

                {(() => {
                  const trimmed = newName.trim();
                  const matches = trimmed
                    ? inventory.filter(i => 
                        i.name.toLowerCase().includes(trimmed.toLowerCase()) && 
                        i.name.toLowerCase().trim() !== trimmed.toLowerCase().trim()
                      )
                    : [];
                  if (matches.length === 0) return null;
                  return (
                    <div className="mt-2 p-2 bg-slate-55 border border-slate-200 rounded-lg text-[11px] space-y-1.5 max-h-32 overflow-y-auto" id="matching-parts-suggestions">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Matching Existing Parts (Click to Select & Merge):</span>
                      <div className="space-y-1">
                        {matches.slice(0, 5).map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              setNewName(item.name);
                              setNewCat(item.category);
                              setNewLoc(item.location || "");
                              setNewSpec(item.specification || "");
                              setNewDesc(item.description || "");
                              setMergeExisting(true);
                            }}
                            className="w-full text-left px-2 py-1 bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-md text-slate-700 font-medium transition-colors cursor-pointer flex justify-between items-center"
                          >
                            <span className="truncate mr-2">{item.name}</span>
                            <span className="text-[9px] text-blue-600 font-bold font-mono bg-blue-50/50 px-1.5 py-0.5 rounded-sm shrink-0">
                              {item.totalQuantity} in stock
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const matchedItem = newName.trim()
                  ? inventory.find(i => i.name.toLowerCase().trim() === newName.toLowerCase().trim())
                  : null;
                if (!matchedItem) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs flex flex-col gap-1.5 animate-fade-in" id="duplicate-warning">
                    <div className="flex items-center gap-1 font-semibold">
                      <AlertCircle className="size-4 shrink-0 text-amber-600" />
                      Component already exists in catalog
                    </div>
                    <p className="text-amber-700 leading-normal">
                      An item named <strong>{matchedItem.name}</strong> is already registered. Adding it will increase its quantity instead of creating a duplicate item card.
                    </p>
                    <label className="flex items-center gap-1.5 mt-1 font-semibold cursor-pointer text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={mergeExisting}
                        onChange={(e) => setMergeExisting(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                        id="merge-existing-toggle"
                      />
                      Merge into existing stock of "{matchedItem.name}" (Add to current {matchedItem.totalQuantity} units)
                    </label>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs rounded-lg px-2.5 py-2 outline-hidden cursor-pointer"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total Quantity</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm outline-hidden"
                    value={newTotalQty}
                    onChange={(e) => setNewTotalQty(Math.floor(Number(e.target.value)))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Stockroom Placement / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Closet C, Partition 12"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  placeholder="What is this item primarily allocated for?"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Technical specification (Datasheet notes)</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden"
                  rows={2}
                  placeholder="e.g., Dual USB, standard 2.4Ghz antenna, 5Vin configuration"
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 lg:hover:bg-blue-600 text-white font-semibold text-xs rounded-lg cursor-pointer animate-fade-in"
                >
                  {(() => {
                    const matchedItem = newName.trim()
                      ? inventory.find(i => i.name.toLowerCase().trim() === newName.toLowerCase().trim())
                      : null;
                    if (matchedItem && mergeExisting) {
                      return loading ? "Merging..." : "Merge & Add Stock";
                    }
                    return loading ? "Registering..." : "Register part";
                  })()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INSTANCE MODAL */}
      {showEditItemModal && editingItem && (
        <div id="edit-catalog-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5 uppercase">
                <Wrench className="size-4 text-blue-400" /> Edit catalog specification
              </h3>
              <button 
                onClick={() => {
                  setShowEditItemModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raspberry Pi Zero 2W"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden font-medium"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs outline-hidden cursor-pointer"
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Placement / Location ID</label>
                  <input
                    type="text"
                    placeholder="e.g. Bay D, Shelf 2"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden"
                    value={editLoc}
                    onChange={(e) => setEditLoc(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total stock count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden font-mono"
                    value={editTotalQty}
                    onChange={(e) => setEditTotalQty(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Available to allocate</label>
                  <input
                    type="number"
                    min="0"
                    max={editTotalQty}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs outline-hidden font-mono"
                    value={editAvailQty}
                    onChange={(e) => setEditAvailQty(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Brief Description</label>
                <input
                  type="text"
                  placeholder="What is this item primarily allocated for?"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-hidden"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Technical datasheet notes / Specs</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs outline-hidden font-mono"
                  rows={2}
                  placeholder="e.g. 5V input, I2C logic level converter needed"
                  value={editSpec}
                  onChange={(e) => setEditSpec(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  {loading ? "Saving catalog..." : "Apply changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItemId && (
        <div id="delete-inventory-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-display text-sm font-bold text-slate-800 mb-2">Delete Inventory Item?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you absolutely sure you want to delete <strong>{inventory.find(i => i.id === deleteConfirmItemId)?.name}</strong> from the stockroom inventory? This will permanently wipe out its specification and count details.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmItemId(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                id="cancel-delete-inventory-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeleteCatalogItem(deleteConfirmItemId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                id="confirm-delete-inventory-btn"
              >
                {loading ? "Deleting..." : "Delete Item"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
