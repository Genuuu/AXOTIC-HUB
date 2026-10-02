const fs = require('fs');
let code = fs.readFileSync('src/components/IdeasBoard.tsx', 'utf8');

if (!code.includes('createAdminLog')) {
  code = code.replace(
    'import { db, createGlobalNotification, handleFirestoreError, OperationType } from "../firebase";',
    'import { db, createGlobalNotification, createAdminLog, handleFirestoreError, OperationType } from "../firebase";'
  );

  // Add for idea creation
  code = code.replace(
    'setNewIdeaDesc("");',
    'setNewIdeaDesc("");\n        createAdminLog("IDEA_CREATED", `Idea created: "${newIdea.title}".`, currentUser);'
  );
  code = code.replace(
    'triggerSuccess("Idea successfully submitted to the hub!");',
    'triggerSuccess("Idea successfully submitted to the hub!");\n      createAdminLog("IDEA_CREATED", `Idea created: "${payload.title}".`, currentUser);'
  );

  // Add for idea deletion
  code = code.replace(
    'triggerSuccess("Idea successfully discarded from Sandbox.");',
    'triggerSuccess("Idea successfully discarded from Sandbox.");\n        createAdminLog("IDEA_DELETED", `Deleted idea ID: ${ideaId}.`, currentUser);'
  );
  code = code.replace(
    'triggerSuccess("Idea successfully deleted.");',
    'triggerSuccess("Idea successfully deleted.");\n      createAdminLog("IDEA_DELETED", `Deleted idea ID: ${ideaId}.`, currentUser);'
  );

  // Add for status update
  code = code.replace(
    'triggerSuccess(`Status updated to ${newStatus} (Sandbox)`);',
    'triggerSuccess(`Status updated to ${newStatus} (Sandbox)`);\n        createAdminLog("IDEA_UPDATED", `Updated idea status to ${newStatus}.`, currentUser);'
  );
  code = code.replace(
    'triggerSuccess(`Status updated to ${newStatus}`);',
    'triggerSuccess(`Status updated to ${newStatus}`);\n      createAdminLog("IDEA_UPDATED", `Updated idea status to ${newStatus}.`, currentUser);'
  );

  fs.writeFileSync('src/components/IdeasBoard.tsx', code);
}
