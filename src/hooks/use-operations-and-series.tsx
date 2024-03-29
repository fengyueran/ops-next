import { useEffect, useState } from 'react';

import { getOperationsByWFID, getThumbnailPath, fetchFileWithCache } from 'src/api';
import { NodeStep, NodeOutput } from 'src/type';
import { getDicomThumbnail, findFileByName } from 'src/utils';

const getQCSeriesID = (operation: OperationData) => {
  try {
    const { attributes } = operation;
    const data = findFileByName(NodeOutput.TARGET_SERIES, attributes.output!);
    const parts = data!.value.split('/');
    const seriesUID = parts[parts.length - 1].replace('.tgz', '');
    return seriesUID;
  } catch (error) {
    return;
  }
};

const formatOperations = (operations: OperationData[]) => {
  const dicomParseOp = operations.find(
    ({ attributes }) => attributes.step === NodeStep.DICOM_PARSE,
  );
  const thumbnails = getDicomThumbnail(dicomParseOp!);

  const getQCThumbnail = (seriesUID?: string) => {
    if (!seriesUID) return;

    const thumbnail = thumbnails.find((t) => t.includes(seriesUID));
    if (thumbnail) return getThumbnailPath(thumbnail);

    return;
  };

  const getThumbnail = (output: { [key: string]: NodeInput }) => {
    try {
      const res = findFileByName(NodeOutput.THUMBNAIL, output);
      return getThumbnailPath(res.value);
    } catch (error) {
      return undefined;
    }
  };

  const formatted = operations.map((operation) => {
    const { id, attributes } = operation;
    const newOperation: DetailOperation = { id, ...attributes };
    const { output, step } = newOperation;

    if (step === NodeStep.QC) {
      const seriesUID = getQCSeriesID(operation);
      newOperation.targetSeries = seriesUID;
      newOperation.passed = !(
        output && findFileByName(NodeOutput.QC_FAILED, output)?.value === 'true'
      );
      newOperation.thumbnail = getQCThumbnail(seriesUID);
    }

    if (
      step === NodeStep.SEGMENT_EDIT ||
      step === NodeStep.REFINE_EDIT ||
      step === NodeStep.VALIDATE_FFR
    ) {
      newOperation.thumbnail = output && getThumbnail(output);
    }

    return newOperation;
  });

  return formatted;
};

const formatAutoQCInfo = (autoQCInfo: AutoQCInfo) => {
  const { passed, failed } = autoQCInfo;
  const mapFun = (info: BaseQCInfo) => {
    const { tags, originTags, ...res } = info;
    return {
      ...res,
      tags: {
        ...info.tags,
        ...info.originTags,
      },
    };
  };
  const series = [...passed, ...failed].map((data) => mapFun(data));
  return series;
};

const getOperations = async (workflowID: string) => {
  const originOperations = await getOperationsByWFID(workflowID);
  const operations = formatOperations(originOperations);
  return operations;
};

const getSeries = async (operations: DetailOperation[]) => {
  const operation = operations.find(({ step }) => step === NodeStep.DICOM_PARSE);
  if (!operation?.output) return [];

  const targetSeries = operations.find(({ step }) => step === NodeStep.QC)?.targetSeries;

  const getThumbnails = (dicomParseOp: DetailOperation) => {
    try {
      const { output } = dicomParseOp;
      const data = findFileByName(NodeOutput.THUMBNAILS, output!);
      const thumbnails = JSON.parse(data!.value);
      return thumbnails as string[];
    } catch (error) {
      return [];
    }
  };

  const dicomInfoFilePath = findFileByName(NodeOutput.DICOM_INFO, operation.output)?.value;
  const autoQCInfo = await fetchFileWithCache<AutoQCInfo>(dicomInfoFilePath!);
  const series = formatAutoQCInfo(autoQCInfo);
  const thumbnails = getThumbnails(operation);

  const newSeries = series.map(({ UID, ...res }) => {
    const thumbnail = thumbnails.find((t) => t.includes(UID));
    return {
      UID,
      ...res,
      selected: targetSeries === UID,
      thumbnail: thumbnail && getThumbnailPath(thumbnail),
    };
  });
  return newSeries;
};

export const useOperationsAndSeries = (workflowID?: string) => {
  const [data, setData] = useState<{ operations: OperationFlatData[]; series: Series[] }>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const start = async () => {
      try {
        const operations = await getOperations(workflowID!);
        const series = await getSeries(operations);
        const validOperaions = operations.filter(
          ({ step, output }) =>
            step !== NodeStep.DICOM_PARSE &&
            step !== NodeStep.RETURNED &&
            step !== NodeStep.GEN_THUMBNAIL &&
            step !== NodeStep.VALIDATE_FFR &&
            output,
        );
        setData({ operations: validOperaions, series });
      } catch (error) {
        setError(error as Error);
      }
    };
    if (workflowID) {
      start();
    } else {
      setData(undefined);
    }
  }, [workflowID]);

  console.log('operations and series', data);

  return { data, error };
};
