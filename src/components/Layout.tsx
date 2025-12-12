import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

interface LayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  analysis: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, main, analysis }) => {
  return (
    <PanelGroup direction="horizontal" className="h-full w-full bg-[#161512]">
      <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col border-r border-[#302e2c]">
        {sidebar}
      </Panel>
      
      <PanelResizeHandle className="w-1 bg-[#302e2c] hover:bg-blue-500 transition-colors flex items-center justify-center group z-10">
        <div className="h-8 w-1 rounded-full bg-gray-600 group-hover:bg-white transition-colors" />
      </PanelResizeHandle>
      
      <Panel defaultSize={55} minSize={30} className="flex flex-col">
        {main}
      </Panel>
      
      <PanelResizeHandle className="w-1 bg-[#302e2c] hover:bg-blue-500 transition-colors flex items-center justify-center group z-10">
        <div className="h-8 w-1 rounded-full bg-gray-600 group-hover:bg-white transition-colors" />
      </PanelResizeHandle>
      
      <Panel defaultSize={25} minSize={20} className="flex flex-col border-l border-[#302e2c]">
        {analysis}
      </Panel>
    </PanelGroup>
  );
};

export default Layout;