export const saveToLocal = async (content: string) => {
  const blob = new Blob([content], {
    type: 'text/plain',
  });

  const fileHandle = await window.showSaveFilePicker({
    suggestedName: 'log.txt',
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
