import { IndexPageLayout } from 'src/components';
import { CaseFilterPanel } from 'src/views/case-filter-panel';
import { CaseList } from 'src/views/case-list';
import { ToolWrapper } from 'src/views/tool-wrapper';

const Header = () => <div>Header</div>;
const Sider = () => <div>Sider</div>;

export const IndexPage = () => {
  return (
    <div>
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
    </div>
  );
};
