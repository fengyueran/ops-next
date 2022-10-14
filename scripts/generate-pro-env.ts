import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const generateProEnv = () => {
  execSync(
    'git config --global --add safe.directory /home/jenkins/agent/workspace/ops-next/ops-next',
  );
  const commitHash = execSync('git rev-parse --short HEAD').toString();
  fs.writeFileSync(path.join(__dirname, '../.env.production'), `REACT_APP_VERSION=${commitHash}`);
};
generateProEnv();
