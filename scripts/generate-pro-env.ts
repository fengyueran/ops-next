import fs from 'fs';
import path from 'path';

const generateProEnv = () => {
  const commitHash = require('child_process').execSync('git rev-parse --short HEAD').toString();
  fs.writeFileSync(path.join(__dirname, '../.env.production'), `REACT_APP_VERSION=${commitHash}`);
};
generateProEnv();
