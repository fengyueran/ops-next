import { IndexPageLayout } from 'src/components';

const Header = () => <div>Header</div>;
const Sider = () => <div>Sider</div>;
const Content = () => <div>Content</div>;
export const IndexPage = () => {
  return (
    <IndexPageLayout
      header={<Header />}
      sider={<Sider />}
      content={<Content />}
    />
  );
};
