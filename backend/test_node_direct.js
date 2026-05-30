const {db} = require('./database');

const sql = 'INSERT INTO fusion_targets (manager_name, task_category, target_type, line, task_count, completed_count, target_company) VALUES (?, ?, ?, ?, ?, ?, ?)';
const params = ['NodeDirect', 'C2B授信', 'C2B授信', '零售', 0, 0, 'NodeDirectCompany'];

db.run(sql, params, function(err) {
    if (err) console.error('Insert Error:', err.message);
    else console.log('Inserted, lastID:', this.lastID);
    
    // Verify
    db.get('SELECT id, manager_name, target_company FROM fusion_targets WHERE manager_name=?', ['NodeDirect'], (err, row) => {
        if (err) console.error('Select Error:', err.message);
        else console.log('Row from DB:', row);
    });
});