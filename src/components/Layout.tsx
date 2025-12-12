import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

interface LayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  analysis: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, main, analysis }) => {
  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={20} minSize={10}>
        {sidebar}
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={60} minSize={30}>
        {main}
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={20} minSize={10}>
        {analysis}
      </Panel>
    </PanelGroup>
  );
};

export default Layout;
