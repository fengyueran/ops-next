### Workflow 定义

```ts
interface Directory {} //文件夹
interface File {} //文件

interface Node {
  name: string;
  input: object;
  output: object;
}

interface GlobalInput {
  dicom: Directory;
  caseInfo: Object;
}

interface Parse extends Node {
  name: 'Parse';
  input: {
    dicom: GlobalInput['dicom'];
  };
  output: {
    series: Directory[]; //按series拆分的dicom文件夹
    thumbnails: File[]; //与series一一对应的缩略图png
    dicomInfo: File; //包含dicom信息的json文件
  };
}

interface QC extends Node {
  name: 'QC';
  input: {
    series: Parse['output']['series'];
    thumbnails: Parse['output']['thumbnails'];
    dicomInfo: Parse['output']['dicomInfo'];
  };
  output: {
    serie: Directory; //选中的serie
    qcReport: File; //qc报告(json文件)
    isQCFailed: string; //QC是否不通过
    clipStartIndex: string; //裁剪起始slice(从0开始)
    clipCount: string; //裁剪的slice数量
  };
}

interface Dicom2Nifti extends Node {
  name: 'Dicom2Nifti';
  input: {
    serie: QC['output']['serie'];
    clipStartIndex?: QC['output']['clipStartIndex'];
    clipCount?: QC['output']['clipCount'];
  };
  output: {
    nifti: File;
  };
}

interface CarsSegmentation extends Node {
  name: 'CarsSegmentation';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
    refineMask: File;
    whsMask: File;
  };
}

interface CARSCoronaryLabeling extends Node {
  name: 'CARSCoronaryLabeling';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    leftVTP: CarsSegmentation['output']['leftVTP'];
    rightVTP: CarsSegmentation['output']['rightVTP'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
  };
}

interface CARSLesionAnalysis extends Node {
  name: 'CARSLesionAnalysis';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    refineMask: CarsSegmentation['output']['refineMask'];
    leftVTP: CARSCoronaryLabeling['output']['leftVTP'];
    rightVTP: CARSCoronaryLabeling['output']['rightVTP'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
  };
}

interface QuantitativeAnalysis extends Node {
  name: 'QuantitativeAnalysis';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    refineMask: CarsSegmentation['output']['refineMask'];
    leftVTP: CARSLesionAnalysis['output']['leftVTP'];
    rightVTP: CARSLesionAnalysis['output']['rightVTP'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
    qaResult: File;
    plaqueMask: File;
  };
}

interface LumenRefinementMask extends Node {
  name: 'LumenRefinementMask';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    plaqueMask: QuantitativeAnalysis['output']['plaqueMask'];
    leftVTP: QuantitativeAnalysis['output']['leftVTP'];
    rightVTP: QuantitativeAnalysis['output']['rightVTP'];
  };
  output: {
    lumenMask: File;
  };
}

interface MaskSwitcher extends Node {
  name: 'MaskSwitcher';
  input: {
    manualMask?: SeattleRefine['output']['refineMask'];
    autoMask?: LumenRefinementMask['output']['lumenMask'];
  };
  output: {
    refineMask: File;
  };
}

interface RefineEditing1 extends Node {
  name: 'RefineEditing1';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    refineMask: MaskSwitcher['output']['refineMask'];
  };
  output: {
    refineMask: File;
  };
}

interface LumenRefinementCL1 extends Node {
  name: 'LumenRefinementCL1';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    leftVTP: QuantitativeAnalysis['output']['leftVTP'];
    rightVTP: QuantitativeAnalysis['output']['rightVTP'];
    refineMask: RefineEditing1['output']['refineMask'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
    ply: File;
    cprSphere: File;
    lumenMask: File;
  };
}

interface SZFFR1 extends Node {
  name: 'SZFFR1';
  input: {
    leftVTP: LumenRefinementCL1['output']['leftVTP'];
    rightVTP: LumenRefinementCL1['output']['rightVTP'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
  };
}

interface GenThumbnail1 extends Node {
  name: 'GenThumbnail1';
  input: {
    leftVTP: SZFFR1['output']['leftVTP'];
    rightVTP: SZFFR1['output']['rightVTP'];
    ply: LumenRefinementCL1['output']['ply'];
  };
  output: {
    thumbnail: File;
  };
}

//?
interface RefineEditing2 extends Node {
  name: 'RefineEditing2';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    refineMask: LumenRefinementCL1['output']['lumenMask'];
  };
  output: {
    refineMask: File;
  };
}

//?
interface LumenRefinementCL2 extends Node {
  name: 'LumenRefinementCL2';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    leftVTP: QuantitativeAnalysis['output']['leftVTP'];
    rightVTP: QuantitativeAnalysis['output']['rightVTP'];
    refineMask: RefineEditing2['output']['refineMask'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
    ply: File;
    cprSphere: File;
    lumenMask: File;
  };
}

//?
interface SZFFR2 extends Node {
  name: 'SZFFR2';
  input: {
    leftVTP: LumenRefinementCL2['output']['leftVTP'];
    rightVTP: LumenRefinementCL2['output']['rightVTP'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
  };
}

//?
interface GenThumbnail2 extends Node {
  name: 'GenThumbnail2';
  input: {
    leftVTP: SZFFR2['output']['leftVTP'];
    rightVTP: SZFFR2['output']['rightVTP'];
    ply: LumenRefinementCL2['output']['ply'];
  };
  output: {
    thumbnail: File;
  };
}

interface ValidateFFR extends Node {
  name: 'ValidateFFR';
  input: {
    leftVTP: SZFFR2['output']['leftVTP'];
    rightVTP: SZFFR2['output']['rightVTP'];
    ply: LumenRefinementCL2['output']['ply'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
  };
}

interface GenCprPly extends Node {
  name: 'ValidateFFR';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    refineMask: LumenRefinementCL2['output']['lumenMask'];
    leftVTP: ValidateFFR['output']['leftVTP'];
    rightVTP: ValidateFFR['output']['rightVTP'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
    ply: File;
    sphere?: File;
    cprs: File[];
  };
}

interface Report extends Node {
  name: 'Report';
  input: {
    caseInfo: GlobalInput['caseInfo'];
    nifti: Dicom2Nifti['output']['nifti'];
    refineMask: LumenRefinementCL2['output']['lumenMask'];
    leftVTP: GenCprPly['output']['leftVTP'];
    rightVTP: GenCprPly['output']['rightVTP'];
    ply: GenCprPly['output']['ply'];
    sphere?: GenCprPly['output']['sphere'];
    cprs?: GenCprPly['output']['cprs'];
  };
  output: {
    reportData: Directory;
    cprPlane: Directory;
    leftVTP: File;
    rightVTP: File;
    ply: File;
    reportPdf: File;
    reportJson: File;
  };
}

//?
interface GenThumbnail3 extends Node {
  name: 'GenThumbnail3';
  input: {
    leftVTP: GenCprPly['output']['leftVTP'];
    rightVTP: GenCprPly['output']['rightVTP'];
    ply: GenCprPly['output']['ply'];
  };
  output: {
    thumbnail: File;
  };
}

//?
interface PDFAndJPG2Dicom extends Node {
  name: 'PDFAndJPG2Dicom';
  input: {
    pdf: File;
    jpg: File;
  };
  output: {
    pdfDcm: File;
    jpgDcm: File;
  };
}

interface SeattleSegment extends Node {
  name: 'SeattleSegment';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
  };
  output: {
    mask: File;
  };
}

interface SeattleSegmentEditing extends Node {
  name: 'SeattleSegmentEditing';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    mask: SeattleSegment['output']['mask'];
  };
  output: {
    mask: File;
  };
}

interface SeattleRefine extends Node {
  name: 'SeattleRefine';
  input: {
    nifti: Dicom2Nifti['output']['nifti'];
    mask: SeattleSegmentEditing['output']['mask'];
  };
  output: {
    leftVTP: File;
    rightVTP: File;
    refineMask: File;
  };
}
```
