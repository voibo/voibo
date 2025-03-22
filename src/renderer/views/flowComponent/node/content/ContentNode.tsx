/*
Copyright 2024 Voibo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { memo, useEffect, useState, useCallback } from "react";
import {
  Handle,
  Node,
  NodeProps,
  NodeResizer,
  Position,
  useReactFlow,
} from "@xyflow/react";
import useClickHandler from "../../../component/common/useClickHandler.jsx";
import { Content } from "../../../../../common/content/content.jsx";
import { useMinutesContentStore } from "../../../store/useContentStore.jsx";
import { useVBStore } from "../../../store/useVBStore.jsx";
import { ContentNodeBaseParam, NodeBase } from "../NodeBase.jsx";
import { TextContentEditView, TextContentView } from "./TextContent.jsx";
import {
  CapturedImageContentEditView,
  CapturedImageContentView,
} from "./CapturedImageContent.jsx";
import { useVBReactflowStore } from "../../../store/flow/useVBReactflowStore.jsx";

export function isContentNode(node: Node): node is ContentNode {
  return node.type === "content";
}

export type ContentNodeParam = ContentNodeBaseParam;

export type ContentNode = Node<ContentNodeParam, "content">;

const ContentNode = (props: NodeProps<ContentNode>) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  const content = useMinutesContentStore(startTimestamp)((state) =>
    state.getContent(props.data.id)
  );
  const reactFlow = useVBReactflowStore.getState();

  // process
  const [editMode, setEditMode] = useState(false);
  const clickHandler = useClickHandler({
    onDoubleClick: () => {
      reactFlow.deselectAll();
      setEditMode(true);
    },
  });

  useEffect(() => {
    if (!props.selected && editMode) {
      setEditMode(false);
    }
  }, [props.selected]);

  // resize handler
  const handleResize = useCallback(
    (_: any, params: any) => {
      if (!content || !startTimestamp) return;

      useMinutesContentStore(startTimestamp)
        .getState()
        .setContent({
          ...content,
          width: Math.max(getMinWidth(), params.width),
        });
    },
    [content, props.id, startTimestamp]
  );

  const getMinWidth = () => {
    if (!content) return 100;
    return content.type === "capturedImage" ? 150 : 100;
  };

  const getMinHeight = () => {
    if (!content) return 30;
    return content.type === "capturedImage" ? 100 : 30;
  };

  return content ? (
    <>
      <NodeResizer
        isVisible={editMode}
        minWidth={getMinWidth()}
        minHeight={getMinHeight()}
        onResize={handleResize}
        handleStyle={{
          width: "15px",
          height: "15px",
          backgroundColor: "#ff0071",
          borderRadius: "50%",
        }}
        lineStyle={{
          borderWidth: "3px",
          borderColor: "#ff0071",
        }}
      />
      <Handle
        id={`left-${props.id}`}
        type="target"
        position={Position.Left}
        className="invisible"
        isConnectable={false}
      />
      <NodeBase nodeProps={props}>
        <div
          className={"p-0 rounded bg-white text-zinc-700"}
          onClick={clickHandler}
        >
          {editMode ? (
            <ContentEditView
              content={content}
              minutesStartTimestamp={startTimestamp}
            />
          ) : (
            <ContentVisibleView
              content={content}
              minutesStartTimestamp={startTimestamp}
            />
          )}
        </div>
      </NodeBase>
      <Handle
        id={`right-${props.id}`}
        type="source"
        position={Position.Right}
        className="invisible"
        isConnectable={false}
      />
    </>
  ) : (
    <></>
  );
};

const ContentVisibleView = (props: {
  content: Content;
  minutesStartTimestamp: number;
}) => {
  const { content, minutesStartTimestamp } = props;
  let contentView;
  switch (content.type) {
    case "text":
      contentView = <TextContentView content={content} />;
      break;
    case "capturedImage":
      contentView = (
        <CapturedImageContentView
          content={content}
          minutesStartTimestamp={minutesStartTimestamp}
          openDialog={false}
        />
      );
      break;
    default:
      contentView = <></>;
  }
  return contentView;
};

const ContentEditView = (props: {
  content: Content;
  minutesStartTimestamp: number;
}) => {
  const { minutesStartTimestamp, content } = props;

  let contentEditView;
  switch (props.content.type) {
    case "text":
      contentEditView = (
        <TextContentEditView
          minutesStartTimestamp={minutesStartTimestamp}
          content={props.content}
        />
      );
      break;
    case "capturedImage":
      contentEditView = (
        <CapturedImageContentEditView
          content={content}
          minutesStartTimestamp={minutesStartTimestamp}
        />
      );
      break;
    default:
      contentEditView = <></>;
  }

  return <div className="grid grid-cols-1">{contentEditView}</div>;
};

export default memo(ContentNode, (prevProps, nextProps) => {
  const shouldNotUpdate =
    prevProps.data.id === nextProps.data.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.dragging === nextProps.dragging;
  return shouldNotUpdate;
});
