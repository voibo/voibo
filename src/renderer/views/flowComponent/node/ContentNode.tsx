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
import { TextField } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useClickHandler from "../../common/useClickHandler.jsx";
import { Content } from "../../store/Content.js";
import { useMinutesContentStore } from "../../store/useContentStore.js";
import { useVFStore } from "../../store/useVFStore.jsx";
import { NodeBase } from "./NodeBase.jsx";

export type ContentNodeParam = {
  content: Content;
};

export type ContentNode = Node<ContentNodeParam, "content">;

const ContentNode = (props: NodeProps<ContentNode>) => {
  // pre process
  // minutesStartTimestamp と対象 content がない場合は何も表示しない
  const minutesStartTimestamp = useVFStore.getState().startTimestamp;
  if (!minutesStartTimestamp) {
    return <></>;
  }
  const content = useMinutesContentStore(minutesStartTimestamp)
    .getState()
    .getContent(props.data.content.id);
  if (!content) {
    return <></>;
  }

  // process
  const [editMode, setEditMode] = useState(false);

  const clickHandler = useClickHandler({
    onDoubleClick: () => {
      setEditMode(true);
    },
  });

  // Remove
  const handleRemove = (event: any) => {
    //event.preventDefault();
    removeContent(content.id);
  };

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
              minutesStartTimestamp={minutesStartTimestamp}
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
    prevProps.data.content.id === nextProps.data.content.id &&
    prevProps.data.content === nextProps.data.content &&
    prevProps.selected === nextProps.selected &&
    prevProps.dragging === nextProps.dragging;
  return shouldNotUpdate;
});

// Util

export function removeContent(contentId: string) {
  const startTimestamp = useVFStore.getState().startTimestamp;
  if (startTimestamp) {
    useMinutesContentStore(startTimestamp).getState().removeContent(contentId);
  }
}
