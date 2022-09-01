import { IndexPageLayout } from 'src/components';
import { CaseFilterPanel } from 'src/views/case-filter-panel';
import { CaseList } from 'src/views/case-list';
import { ToolWrapper } from 'src/views/tool-wrapper';
import { Header } from 'src/views/header';
import { Sider } from 'src/views/sider';
import { CaseRealtime } from 'src/views/case-realtime';
import { CaseDetailDrawer } from 'src/views/case-detail-drawer';

export const CaseListPage = () => {
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
      <CaseDetailDrawer />
    </>
  );
};
