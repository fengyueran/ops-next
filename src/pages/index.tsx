import { IndexPageLayout } from 'src/components';
import { CaseFilterPanel } from 'src/views/case-filter-panel';
import { CaseList } from 'src/views/case-list';

const Header = () => <div>Header</div>;
const Sider = () => <div>Sider</div>;

export const IndexPage = () => {
  return (
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
  );
};
