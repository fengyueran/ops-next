export const saveToLocal = async (fileName: string, content: string) => {
  const blob = new Blob([content], {
    type: 'text/plain',
  });

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
