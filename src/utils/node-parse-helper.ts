import { NodeOutput } from 'src/type';

export const findFileByName = (name: string, inputs: NodeInput[]) => {
  const found = inputs.find(({ Name }) => Name === name);
  return found;
};

export const getDicomThumbnail = (dicomParseOp: OperationData) => {
  try {
    const { output } = dicomParseOp!.attributes;
    const data = findFileByName(NodeOutput.THUMBNAILS, output!);
    const thumbnails = JSON.parse(data!.Value);
    return thumbnails as string[];
  } catch (error) {
    return [];
  }
};
