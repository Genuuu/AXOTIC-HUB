const fs = require('fs');
let code = fs.readFileSync('src/components/CompetitionsHub.tsx', 'utf8');

const selectOptions = `<option value="scheduled">Scheduled</option>
                        <option value="postponed">Postponed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="finished">Finished</option>`;

code = code.replace(
`<option value="scheduled">Scheduled</option>
                        <option value="postponed">Postponed</option>
                        <option value="cancelled">Cancelled</option>`, selectOptions);

fs.writeFileSync('src/components/CompetitionsHub.tsx', code);
console.log("Updated Select");
