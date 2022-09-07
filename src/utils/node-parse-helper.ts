import { NodeOutput } from 'src/type';

export const findFileByName = (name: string, inputs: { [key: string]: NodeInput }) => {
  const found = inputs[name];
  if (!found) throw new Error(`Can't find the file which name is ${name}`);
  if (!found.value) throw new Error(`${name} value is null`);
  return found;
};

export const getDicomThumbnail = (dicomParseOp: OperationData) => {
  try {
    const { output } = dicomParseOp!.attributes;
    const data = findFileByName(NodeOutput.THUMBNAILS, output!);
    const thumbnails = JSON.parse(data!.value);
    return thumbnails as string[];
  } catch (error) {
    return [];
  }
};
