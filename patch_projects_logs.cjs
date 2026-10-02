const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectHub.tsx', 'utf8');

if (!code.includes('createAdminLog("PROJECT_LOG_ADDED"')) {
  code = code.replace(
    'setNewLogContent("");\n      return;\n    }',
    'setNewLogContent("");\n      createAdminLog("PROJECT_LOG_ADDED", `Added log to project: ${selectedProject.title} in Sandbox.`, currentUser);\n      return;\n    }'
  );
  code = code.replace(
    'setNewLogContent("");\n    } catch (err) {',
    'setNewLogContent("");\n      createAdminLog("PROJECT_LOG_ADDED", `Added log to project: ${selectedProject.title}.`, currentUser);\n    } catch (err) {'
  );

  fs.writeFileSync('src/components/ProjectHub.tsx', code);
}
