const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

code = code.replace(
  '          setSelectedProject(null);\n        }\n      }\n      return;\n    }',
  '          setSelectedProject(null);\n        }\n        createAdminLog("PROJECT_DELETED", `Deleted project ID: ${projId} in Sandbox.`, currentUser);\n      }\n      return;\n    }'
);

code = code.replace(
  '      if (selectedProject?.id === projId) {\n        setSelectedProject(null);\n      }\n    } catch (err) {',
  '      if (selectedProject?.id === projId) {\n        setSelectedProject(null);\n      }\n      createAdminLog("PROJECT_DELETED", `Deleted project ID: ${projId}.`, currentUser);\n    } catch (err) {'
);

fs.writeFileSync('src/components/ProjectHub.tsx', code);
