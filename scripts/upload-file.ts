import fs from 'fs';
import { login } from './login';

const { execSync } = require('child_process');

const HOST = `http://192.168.201.243:8008/v1/ops/files/upload`;
const uploadDir = async (dir: string) => {
  const { jwt } = await login('xinghunm', '12345678');
  let args = '';
  const files = fs.readdirSync(dir);

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    args += ` -F "originDicom/${file}=@${dir}/${file}"`;
  }
  const data = execSync(
    `curl ${HOST} -XPOST -H "Content-Type: multipart/form-data" ${args} -H "Authorization: Bearer ${jwt}"`,
  ).toString();
  console.log('data', data);
};

export const uploadFile = (file: string) => {
  let args = '';

  args += ` -F "originNifti=@${file}"`;

  const data = execSync(
    `curl ${HOST} -XPOST -H "Content-Type: multipart/form-data" ${args}`,
  ).toString();
  console.log('data', data);
};

const run = () => {
  const fileOrDir = process.argv[2];
  if (!fileOrDir) throw new Error('There is no file or directory');

  const isDir = fs.lstatSync(fileOrDir).isDirectory();
  if (isDir) {
    uploadDir(fileOrDir);
  } else {
    uploadFile(fileOrDir);
  }
};
run();

// uploadDir('/Users/xinghunm/xinghun/data/dvtool/dicom');
// uploadFile('/Users/xinghunm/xinghun/data/dvtool/dicom2-nifti-output/nifti.nii');
