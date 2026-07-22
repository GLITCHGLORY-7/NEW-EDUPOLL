const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Matrix\\.antigravity\\pollsystem';
const destDir = 'C:\\Users\\Matrix\\.antigravity\\college project';

function copyDirSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      // Skip node_modules and zip files to make it fast
      if (childItemName === 'node_modules' || childItemName.endsWith('.zip') || childItemName === '.git') {
        return;
      }
      copyDirSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function run() {
  console.log('Cleaning up old root files in college project...');
  const itemsToDelete = [
    'src', 'public', 'server', 'dist', 'package.json', 'package-lock.json', 
    'vite.config.js', 'start.js', 'README.md', 'vercel.json', 'test_db.js', 'test_db_write.js', 'apply_schema.js', 'apply_schema_pooler.js'
  ];
  
  for (const item of itemsToDelete) {
    const p = path.join(destDir, item);
    if (fs.existsSync(p)) {
      console.log('Deleting:', p);
      fs.rmSync(p, { recursive: true, force: true });
    }
  }

  console.log('Copying reorganized project from pollsystem...');
  copyDirSync(srcDir, destDir);
  console.log('Sync complete!');
}

run();
