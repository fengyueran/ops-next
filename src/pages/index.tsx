import { IndexPageLayout } from 'src/components';
import { CaseFilterPanel } from 'src/views/case-filter-panel';
import { CaseList } from 'src/views/case-list';
import { ToolWrapper } from 'src/views/tool-wrapper';
import { Header } from 'src/views/header';
import { CaseRealtime } from 'src/views/case-realtime';

const Sider = () => <div>Sider</div>;

export const IndexPage = () => {
  return (
    <>
      <IndexPageLayout
        header={<Header />}
        sider={<Sider />}
        content={
          <>
            <CaseFilterPanel />
            <CaseList />
          </>
        }
      />
      <ToolWrapper />
      <CaseRealtime />
    </>
  );
};
