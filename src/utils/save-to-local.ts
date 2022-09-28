import { download } from './download';

export const saveToLocal = async (fileName: string, content: string) => {
  const blob = new Blob([content], {
    type: 'text/plain',
  });
  if (!window.showSaveFilePicker) {
    const url = URL.createObjectURL(blob);
    return download(fileName, url);
  }

  const fileHandle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: 'TXT file',
        accept: { 'text/plain': ['.txt'] },
      },
    ],
  });
  const fileStream = await fileHandle.createWritable();
  await fileStream.write(blob);
  await fileStream.close();
};
