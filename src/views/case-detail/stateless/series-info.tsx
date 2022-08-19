import React from 'react';
import styled from 'styled-components';

interface Props {
  series: any;
  title: string;
}

const Container = styled.div`
  width: 100%;
  display: flex;
`;

const Image = styled.img`
  width: 100px;
  height: 100px;
  margin-right: 16px;
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
`;

const Title = styled.div`
  height: 22px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  line-height: 22px;
`;

const DicomInfo = styled.div`
  font-size: 14px;
  line-height: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DicomTagName = styled.span`
  color: rgba(0, 0, 0, 0.65);
`;

const DicomTagValue = styled.span`
  color: rgba(0, 0, 0, 0.85);
  margin-left: 8px;
`;

const getDicomData = ({ tags }: any): Array<{ name: string; value: string | number }> => [
  {
    name: 'Modality',
    value: tags.Modality,
  },
  { name: 'KVP', value: tags.KVP },
  {
    name: 'Number of Slices',
    value: tags.NumberOfSlices,
  },
  {
    name: 'Slice Thickness(mm)',
    value: tags.SliceThickness,
  },
  {
    name: 'Slice Interval',
    value: tags.SliceInterval,
  },
  {
    name: 'CTDIvol',
    value: tags.CTDIvol,
  },
  {
    name: 'Tube Current(mAs)',
    value: tags.XRayTubeCurrent,
  },
  {
    name: 'Contrast Agent',
    value: tags.ContrastBolusAgent,
  },
  {
    name: 'Manufacture',
    value: tags.Manufacturer,
  },
  {
    name: 'Inplane Dimension',
    value: `(${tags.Rows}, ${tags.Columns})`,
  },
  {
    name: 'Inplane Resolution',
    value: tags.InplaneResolution,
  },
  {
    name: 'Series InstanceUID',
    value: tags.SeriesInstanceUID,
  },
  {
    name: 'Series Description',
    value: tags.SeriesDescription,
  },
  {
    name: 'Institution Name',
    value: tags.InstitutionName,
  },
];

const SeriesInfo: React.FC<Props> = ({ series, title }) => {
  return (
    <Container>
      <Image src={series.thumbnail} />
      <Content>
        <Title>{title}</Title>
        {getDicomData(series).map(({ name, value }) => (
          <DicomInfo key={name}>
            <DicomTagName>{name}:</DicomTagName>
            <DicomTagValue>{value}</DicomTagValue>
          </DicomInfo>
        ))}
      </Content>
    </Container>
  );
};

export default SeriesInfo;
