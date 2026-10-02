const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

if (!code.includes('createAdminLog')) {
  code = code.replace(
    'import { db, createGlobalNotification, handleFirestoreError, OperationType } from "../firebase";',
    'import { db, createGlobalNotification, createAdminLog, handleFirestoreError, OperationType } from "../firebase";'
  );

  // handleCreateProject
  code = code.replace(
    'setShowCreateModal(false);',
    'setShowCreateModal(false);\n      createAdminLog("PROJECT_CREATED", `Created new project: "${newTitle.trim()}".`, currentUser);'
  );
  code = code.replace(
    'triggerSuccess("Project initialization routine executed successfully.");',
    'triggerSuccess("Project initialization routine executed successfully.");\n      createAdminLog("PROJECT_CREATED", `Created new project: "${payload.title}".`, currentUser);'
  );

  // handleDeleteProject (Mock)
  code = code.replace(
    'triggerSuccess("Project archived (Sandbox)");',
    'triggerSuccess("Project archived (Sandbox)");\n        createAdminLog("PROJECT_DELETED", `Deleted project ID: ${projId} in Sandbox.`, currentUser);'
  );

  // handleDeleteProject (Real)
  // Wait, let's look at how handleDeleteProject handles deletion.
  // I will just use sed or string replace for standard delete flow.
}

fs.writeFileSync('src/components/ProjectHub.tsx', code);
