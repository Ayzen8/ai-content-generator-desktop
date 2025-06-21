const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/content.db');

console.log('Fixing Instagram Theme Pages parent-child relationships...\n');

// First, get the correct ID for Instagram Theme Pages
db.get(`SELECT id FROM niches WHERE name = 'Instagram Theme Pages'`, (err, row) => {
  if (err) {
    console.error('Error finding Instagram Theme Pages:', err);
    db.close();
    return;
  }
  
  if (!row) {
    console.log('Instagram Theme Pages not found!');
    db.close();
    return;
  }
  
  const instagramThemePagesId = row.id;
  console.log(`Instagram Theme Pages ID: ${instagramThemePagesId}`);
  
  // List of Instagram sub-niches that should be children
  const instagramSubNiches = [
    'Minimalist Aesthetic',
    'Dark Academia', 
    'Cottagecore',
    'Streetwear Fashion',
    'Plant Parent',
    'Memes & Humor',
    'Quotes & Motivation',
    'Aesthetics & Visuals'
  ];
  
  // Update each sub-niche to have the correct parent_id
  let completed = 0;
  
  instagramSubNiches.forEach(nicheName => {
    db.run(
      `UPDATE niches SET parent_id = ? WHERE name = ?`,
      [instagramThemePagesId, nicheName],
      function(err) {
        if (err) {
          console.error(`Error updating ${nicheName}:`, err);
        } else {
          console.log(`✅ Updated ${nicheName} to have parent_id ${instagramThemePagesId}`);
        }
        
        completed++;
        if (completed === instagramSubNiches.length) {
          // Verify the changes
          console.log('\nVerifying changes...');
          db.all(
            `SELECT id, name FROM niches WHERE parent_id = ?`,
            [instagramThemePagesId],
            (err, children) => {
              if (err) {
                console.error('Error verifying:', err);
              } else {
                console.log(`\nInstagram Theme Pages now has ${children.length} children:`);
                children.forEach(child => {
                  console.log(`  ├─ ${child.name} (ID: ${child.id})`);
                });
              }
              db.close();
            }
          );
        }
      }
    );
  });
});
