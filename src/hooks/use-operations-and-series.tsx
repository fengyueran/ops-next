import { useEffect, useState } from 'react';

import { getOperationsByWFID, fullPath, fetchFileWithCache } from 'src/api';
import { NodeStep, NodeOutput } from 'src/type';
import { getDicomThumbnail, findFileByName } from 'src/utils';

const getQCSeriesID = (operation: OperationData) => {
  try {
    const { attributes } = operation;
    const data = findFileByName(NodeOutput.TARGET_SERIES, attributes.output!);
    const parts = data!.Value.split('/');
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
    if (thumbnail) return fullPath(thumbnail);

    return;
  };

  const formatted = operations.map((operation) => {
    const { id, attributes } = operation;
    const newOperation: DetailOperation = { id, ...attributes };
    const { output, step } = newOperation;

    if (step === NodeStep.QC) {
      const seriesUID = getQCSeriesID(operation);
      newOperation.targetSeries = seriesUID;
      newOperation.passed = !(findFileByName(NodeOutput.QC_FAILED, output)?.Value === 'true');
      newOperation.thumbnail = getQCThumbnail(seriesUID);
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
      const thumbnails = JSON.parse(data!.Value);
      return thumbnails as string[];
    } catch (error) {
      return [];
    }
  };

  const dicomInfoFilePath = findFileByName(NodeOutput.DICOM_INFO, operation.output)?.Value;
  const autoQCInfo = await fetchFileWithCache<AutoQCInfo>(dicomInfoFilePath!);
  const series = formatAutoQCInfo(autoQCInfo);
  const thumbnails = getThumbnails(operation);

  const newSeries = series.map(({ UID, ...res }) => {
    const thumbnail = thumbnails.find((t) => t.includes(UID));
    return {
      UID,
      ...res,
      selected: targetSeries === UID,
      thumbnail: thumbnail && fullPath(thumbnail),
    };
  });
  return newSeries;
};

export const useOperationsAndSeries = (workflowID?: string) => {
  const [data, setData] = useState<{ operations: OperationFlatData[]; series: Series[] }>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const start = async () => {
      try {
        const operations = await getOperations(workflowID!);
        const series = await getSeries(operations);
        const validOperaions = operations.filter(
          ({ step, output }) =>
            step !== NodeStep.DICOM_PARSE && step !== NodeStep.COMPLETE && output,
        );
        setData({ operations: validOperaions, series });
      } catch (error) {
        setError((error as Error).message);
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
