import styled from 'styled-components';

const Row = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
`;

const ElasticBox = styled.div`
  flex-grow: 1;
`;

export { Row, Col, ElasticBox };
