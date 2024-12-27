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
import { memo, useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useClickHandler from "../../component/common/useClickHandler.jsx";
import { Content } from "../../../../common/content/content.js";
import { useMinutesContentStore } from "../../store/useContentStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { ContentNodeBaseParam, NodeBase } from "./NodeBase.jsx";

export type ContentNodeParam = ContentNodeBaseParam;

export type ContentNode = Node<ContentNodeParam, "content">;

const ContentNode = (props: NodeProps<ContentNode>) => {
  const startTimestamp = useVBStore.getState().startTimestamp;
  const content = useMinutesContentStore(startTimestamp)((state) =>
    state.getContent(props.data.id)
  );

  // process
  const [editMode, setEditMode] = useState(false);
  const clickHandler = useClickHandler({
    onDoubleClick: () => {
      setEditMode(true);
    },
  });

  useEffect(() => {
    if (!props.selected && editMode) {
      setEditMode(false);
    }
  }, [props.selected]);

  return content ? (
    <>
      <NodeBase nodeProps={props}>
        <div
          className={"p-4 rounded bg-white text-zinc-700"}
          onClick={clickHandler}
        >
          {editMode ? (
            <ContentEditView
              content={content}
              minutesStartTimestamp={startTimestamp}
            />
          ) : (
            <ContentVisibleView content={content} />
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

const ContentEditView = (props: {
  content: Content;
  minutesStartTimestamp: number;
}) => {
  const { minutesStartTimestamp } = props;

  // Content の編集
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
    default:
      contentEditView = <></>;
  }

  return (
    <div className="pt-2 grid grid-cols-1 space-y-4">{contentEditView}</div>
  );
};

const TextContentEditView = (props: {
  minutesStartTimestamp: number;
  content: Content;
}) => {
  const { minutesStartTimestamp, content } = props;
  // Content の編集
  const [stateTempContent, setTempContent] = useState(content.content);

  const handleContentChange = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>
  ) => {
    useMinutesContentStore(minutesStartTimestamp)
      .getState()
      .setContent({
        ...content,
        content: stateTempContent,
      });
  };

  return (
    <div className="p-0 grid grid-cols-1 space-y-4">
      <TextField
        fullWidth
        variant="outlined"
        multiline
        minRows={3}
        size="small"
        value={stateTempContent}
        onChange={(event) => setTempContent(event.target.value)}
        onBlur={handleContentChange}
      ></TextField>
    </div>
  );
};

const ContentVisibleView = (props: { content: Content }) => {
  const { content } = props;
  return (
    <Markdown remarkPlugins={[remarkGfm]} className={"markdown"}>
      {content.content}
    </Markdown>
  );
};

export default memo(ContentNode, (prevProps, nextProps) => {
  const shouldNotUpdate =
    prevProps.data.id === nextProps.data.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.dragging === nextProps.dragging;
  return shouldNotUpdate;
});
