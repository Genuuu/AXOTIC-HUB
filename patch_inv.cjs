const fs = require('fs');
let code = fs.readFileSync('src/components/InventoryManager.tsx', 'utf8');

code = code.replace(
  'import { db, handleFirestoreError, OperationType } from "../firebase";',
  'import { db, handleFirestoreError, OperationType, createAdminLog } from "../firebase";'
);

// Add to handleRegisterItem
code = code.replace(
  'triggerFeedback("New hardware component successfully registered in Sandbox.");',
  'triggerFeedback("New hardware component successfully registered in Sandbox.");\n      createAdminLog("INVENTORY_ADDED", `Registered new item: "${trimmedName}" in Sandbox.`, currentUser);'
);
code = code.replace(
  'triggerFeedback("New hardware component successfully registered.");',
  'triggerFeedback("New hardware component successfully registered.");\n      createAdminLog("INVENTORY_ADDED", `Registered new item: "${trimmedName}".`, currentUser);'
);

// Add to handleUpdateItem
code = code.replace(
  'triggerFeedback("Component parameters securely updated in Sandbox.");',
  'triggerFeedback("Component parameters securely updated in Sandbox.");\n        createAdminLog("INVENTORY_UPDATED", `Updated component parameters for: "${payload.name}" in Sandbox.`, currentUser);'
);
code = code.replace(
  'triggerFeedback("Component parameters securely updated.");',
  'triggerFeedback("Component parameters securely updated.");\n      createAdminLog("INVENTORY_UPDATED", `Updated component parameters for: "${payload.name}".`, currentUser);'
);

// Add to handleDeleteCatalogItem
code = code.replace(
  'triggerFeedback("Component successfully purged from hardware catalog (Sandbox).");',
  'triggerFeedback("Component successfully purged from hardware catalog (Sandbox).");\n        createAdminLog("INVENTORY_DELETED", `Deleted component from catalog (ID: ${itemId}) in Sandbox.`, currentUser);'
);
code = code.replace(
  'triggerFeedback("Component successfully purged from hardware catalog.");',
  'triggerFeedback("Component successfully purged from hardware catalog.");\n      createAdminLog("INVENTORY_DELETED", `Deleted component from catalog (ID: ${itemId}).`, currentUser);'
);

// Add to handlePerformAllocation
code = code.replace(
  'triggerFeedback(`Successfully allocated ${reqQty}x ${checkoutItem.name} to ${proj.title} (Sandbox).`);',
  'triggerFeedback(`Successfully allocated ${reqQty}x ${checkoutItem.name} to ${proj.title} (Sandbox).`);\n        createAdminLog("HARDWARE_ALLOCATED", `Allocated ${reqQty}x ${checkoutItem.name} to project: ${proj.title} in Sandbox.`, currentUser);'
);
code = code.replace(
  'triggerFeedback(`Successfully allocated ${reqQty}x ${checkoutItem.name} to ${proj.title}.`);',
  'triggerFeedback(`Successfully allocated ${reqQty}x ${checkoutItem.name} to ${proj.title}.`);\n      createAdminLog("HARDWARE_ALLOCATED", `Allocated ${reqQty}x ${checkoutItem.name} to project: ${proj.title}.`, currentUser);'
);

// Add to handlePerformSalvage
code = code.replace(
  'triggerFeedback(`Successfully returned ${returnQty}x ${selectedSalvageHardware.name} (Sandbox).`);',
  'triggerFeedback(`Successfully returned ${returnQty}x ${selectedSalvageHardware.name} (Sandbox).`);\n        createAdminLog("HARDWARE_SALVAGED", `Salvaged/returned ${returnQty}x ${selectedSalvageHardware.name} from project in Sandbox.`, currentUser);'
);
code = code.replace(
  'triggerFeedback(`Successfully returned ${returnQty}x ${selectedSalvageHardware.name}.`);',
  'triggerFeedback(`Successfully returned ${returnQty}x ${selectedSalvageHardware.name}.`);\n      createAdminLog("HARDWARE_SALVAGED", `Salvaged/returned ${returnQty}x ${selectedSalvageHardware.name} from project.`, currentUser);'
);

fs.writeFileSync('src/components/InventoryManager.tsx', code);
