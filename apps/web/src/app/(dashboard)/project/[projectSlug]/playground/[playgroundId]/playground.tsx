"use client";
import "reflect-metadata";

import { useRete } from "rete-react-plugin";
import { createEditorFunc } from "./playground/editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportEditor } from "./playground/io";
import { getPlayground, savePlayground, savePlaygroundLayout } from "./action";
import { useParams } from "next/navigation";
import {
  CraftContext,
  createCraftStore,
  useCraftStore,
} from "./playground/store";
import { debounce } from "lodash-es";
import { Maximize } from "lucide-react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getControl } from "./playground/control";
import { ContextMenuProvider } from "./playground/context-menu";
import * as FlexLayout from "flexlayout-react";
import { getConnectionSockets } from "./playground/utis";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

const defaultLayout: FlexLayout.IJsonModel = {
  global: {},
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 50,
        children: [
          {
            type: "tab",
            name: "Inspector",
            component: "inspector",
            enableClose: false,
          },
        ],
      },
      {
        type: "tabset",
        weight: 50,
        children: [
          {
            type: "tab",
            name: "Composer",
            component: "rete",
            enableClose: false,
          },
        ],
      },
    ],
  },
};

export const Playground: React.FC<{
  playground: NonNullable<Awaited<ReturnType<typeof getPlayground>>>;
}> = ({ playground }) => {
  const params = useParams();
  const store = useRef(
    createCraftStore({
      layout: FlexLayout.Model.fromJson(
        (playground.layout as FlexLayout.IJsonModel) || defaultLayout
      ),
      projectSlug: params.projectSlug as string,
      playgroundId: params.playgroundId as string,
    })
  );

  const { layout } = useStore(store.current);

  useEffect(() => {
    const layoutListener = store.current.subscribe(
      (state) => state.layout,
      async (layout) => {
        console.log("layout changed", { layout });
        await savePlaygroundLayout({
          layout: layout.toJson(),
          playgroundId: playground.id,
        });
      }
    );
    return () => layoutListener();
  }, []);
  const debouncedLayoutChange = useCallback(
    debounce(async (layout: FlexLayout.Model) => {
      await savePlaygroundLayout({
        layout: layout.toJson(),
        playgroundId: playground.id,
      });
    }, 2000),
    [layout]
  );

  const factory = (layoutNode: FlexLayout.TabNode) => {
    const component = layoutNode.getComponent();
    const config = layoutNode.getConfig();
    if (component === "button") {
      return <button>{layoutNode.getName()}</button>;
    }
    if (component === "inspector") {
      return <InspectorWindow />;
    }
    if (component === "rete") {
      return <Composer playground={playground} store={store} />;
    }
    if (component === "inspectorNode") {
      return <InspectorNode nodeId={config.nodeId} />;
    }
  };

  return (
    <CraftContext.Provider value={store?.current}>
      <TooltipProvider>
        <div className="w-full h-full bg-muted/20 min-h-[calc(100vh-5rem)] py-1 px-1 relative">
          <FlexLayout.Layout
            model={layout}
            factory={factory}
            onModelChange={(model) => debouncedLayoutChange(model)}
            realtimeResize
          />
        </div>
      </TooltipProvider>
    </CraftContext.Provider>
  );
};

const Composer: React.FC<{ playground: any; store: any }> = ({
  playground,
  store,
}) => {
  const di = useCraftStore((state) => state.di);
  const projectSlug = useCraftStore((state) => state.projectSlug);
  const playgroundId = useCraftStore((state) => state.playgroundId);
  const createEditor = useMemo(() => {
    return createEditorFunc(playground, store.current);
  }, [playground, store.current]);
  const [ref, rete] = useRete(createEditor);
  const saveDebounced = debounce(
    (state) =>
      savePlayground({
        projectSlug: projectSlug as string,
        playgroundId: playgroundId as string,
        nodes: state.nodes,
        edges: state.edges,
      }),
    2000
  );
  const onChange = useCallback(
    async (data: any) => {
      const json = await exportEditor(rete?.di.editor!);
      console.log("@@@@@@@", { json });
      saveDebounced({
        projectSlug: projectSlug as string,
        playgroundId: playgroundId as string,
        nodes: json.nodes,
        edges: json.edges,
      });
    },
    [rete]
  );

  const { toast } = useToast();

  useEffect(() => {
    rete?.editor.addPipe((context) => {
      switch (context.type) {
        case "connectioncreate": {
          const { data } = context;
          const { source, target } = getConnectionSockets(di?.editor!, data);
          if (target && !source.isCompatibleWith(target)) {
            console.log("Sockets are not compatible", "error");
            toast({
              title: "Sockets are not compatible",
              description: (
                <span>
                  Socket <Badge> {source.name} </Badge> is not compatible with{" "}
                  <Badge>{target.name} </Badge>
                </span>
              ),
            });
            return;
          }
          break;
        }
        case "nodecreated":
        case "noderemoved":
        case "connectioncreated":
        case "connectionremoved":
          onChange(context);
        default:
      }

      return context;
    });
  }, [rete]);
  return (
    <div className="w-full h-full">
      <div className="absolute top-1 right-1 z-50 flex ">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size="icon" onClick={() => di?.setUI()}>
              <Maximize />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Center the content</TooltipContent>
        </Tooltip>
      </div>
      <ContextMenuProvider>
        <div ref={ref} className="w-full h-full " />
      </ContextMenuProvider>
    </div>
  );
};

const InspectorWindow: React.FC<{}> = ({}) => {
  const di = useCraftStore((state) => state.di);
  const layout = useCraftStore((state) => state.layout);
  const selectedNodeId = useCraftStore((state) => state.selectedNodeId);

  const handlePinTab = () => {
    const selectedNode = selectedNodeId && di?.editor.getNode(selectedNodeId);
    if (!selectedNode) return;
    const tabset = layout.getActiveTabset()?.getId()!;
    layout.doAction(
      FlexLayout.Actions.addNode(
        {
          type: "tab",
          component: "inspectorNode",
          name: selectedNode.label,
          config: {
            nodeId: selectedNodeId,
          },
        },
        tabset,
        FlexLayout.DockLocation.CENTER,
        1
      )
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-4">
      {selectedNodeId ? (
        <div>
          <Button onClick={handlePinTab}>Pin</Button>
          <InspectorNode nodeId={selectedNodeId} />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          Select a node to inspect
        </div>
      )}
    </div>
  );
};
const InspectorNode: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const di = useCraftStore((state) => state.di);
  const node = di?.editor.getNode(nodeId);
  if (!node) return null;
  const controls = Object.entries(node.controls);
  return (
    <div className="h-full w-full flex flex-col p-2">
      <div className="flex flex-col h-full overflow-hidden max-h-[calc(100vh-12rem)]">
        {controls.map(([key, control]) => (
          <ControlWrapper key={key} control={control} />
        ))}
      </div>
    </div>
  );
};

const ControlWrapper: React.FC<{ control: any }> = ({ control }) => {
  const ref = useRef<HTMLDivElement>(null);
  const ControlElement = getControl({
    element: ref.current!,
    type: "control",
    payload: control!,
  });
  return (
    <>
      <div ref={ref} />
      <ControlElement data={control} />
    </>
  );
};
