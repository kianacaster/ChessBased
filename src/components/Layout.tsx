import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

interface LayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  analysis: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, main, analysis }) => {
  return (
    <PanelGroup direction="horizontal" className="h-full w-full bg-background text-foreground">
      <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col border-r border-border bg-sidebar">
        {sidebar}
      </Panel>
      
      <PanelResizeHandle className="relative w-1.5 flex items-center justify-center bg-transparent -ml-[3px] z-50 hover:cursor-col-resize group outline-none">
        <div className="absolute inset-y-0 w-[1px] bg-border transition-colors group-hover:bg-primary group-focus:bg-primary" />
      </PanelResizeHandle>
      
      <Panel defaultSize={55} minSize={30} className="flex flex-col bg-background">
        {main}
      </Panel>
      
      <PanelResizeHandle className="relative w-1.5 flex items-center justify-center bg-transparent -mr-[3px] z-50 hover:cursor-col-resize group outline-none">
         <div className="absolute inset-y-0 w-[1px] bg-border transition-colors group-hover:bg-primary group-focus:bg-primary" />
      </PanelResizeHandle>
      
      <Panel defaultSize={25} minSize={20} className="flex flex-col border-l border-border bg-sidebar">
        {analysis}
      </Panel>
    </PanelGroup>
  );
};

export default Layout;