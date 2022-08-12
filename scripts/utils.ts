import crypto from 'crypto';

const createSha1 = (str: string) => {
  const shasum = crypto.createHash('sha1');
  shasum.update(str);
  const hex = shasum.digest('hex');
  return hex;
};

export const createCaseID = (StudyInstanceUID: string) => {
  const hex = createSha1(StudyInstanceUID);
  const caseID = `HT-${hex.toUpperCase()}`;
  return caseID.slice(0, 9);
};
