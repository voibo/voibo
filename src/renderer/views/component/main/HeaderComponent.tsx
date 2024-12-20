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
import {
  AccessTime,
  Delete,
  Download,
  Home,
  Menu as MenuIcon,
  SmartToyOutlined,
} from "@mui/icons-material";
import {
  Button,
  FormControl,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import React, { ChangeEvent, useEffect, useState } from "react";
import { formatTimestamp } from "../../../util.js";
import { VirtualAssistantManager } from "../assistant/VirtualAssistantManager.jsx";
import { useConfirmDialog } from "../common/useConfirmDialog.jsx";
import { useDetailViewDialog } from "../common/useDetailViewDialog.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { TranscribeButton } from "./TranscribeButton.jsx";
import { useMinutesTitleStore } from "../../store/useMinutesTitleStore.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { useMinutesAssistantStore } from "../../store/useAssistantsStore.jsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { processMinutesAction } from "../../action/MinutesAction.js";
import { useMinutesContentStore } from "../../store/useContentStore.jsx";
import { useVBReactflowStore } from "../../store/useVBReactflowStore.jsx";
import { ExpandJSONOptions } from "../../store/IDBKeyValPersistStorage.jsx";

export const HeaderComponent = () => {
  const vbState = useVBStore((state) => state);

  const handleOpenHome = () => {
    processMinutesAction({
      type: "openHomeMenu",
    });
  };

  return (
    <div className="p-4 grid grid-cols-3 w-screen ">
      <div className="flex items-center">
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleOpenHome}
          edge="start"
          sx={{
            ...(vbState.mainMenuOpen && { display: "none" }),
          }}
          className="mr-2"
          disabled={vbState.recording}
        >
          <img
            src="./asset/va_logo_black.svg"
            className="h-8 object-contain "
          />
        </IconButton>
        <div className="flex flex-row items-end">
          <MinutesTitle />
          <div className="ml-4 flex flex-row text-xs items-center text-white/50">
            <AccessTime className="h-4 w-4 mr-2" />
            <div className="w-12">
              {formatTimestamp(vbState.startTimestamp)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flew-row items-center justify-center">
        <div>
          <TranscribeButton />
        </div>
      </div>
      <div className="flex flex-row items-center space-x-2 justify-end">
        <AssistantButton />
        <OthersMenuButton />
      </div>
    </div>
  );
};

const MinutesTitle = (props: {}) => {
  const vbState = useVBStore((state) => state);
  const useMinutesTitle = useMinutesTitleStore((state) => state);
  const defaultTitle = `会議: ${formatTimestamp(vbState.startTimestamp)}`;
  let minutesTitle =
    useMinutesTitle.getMinutesTitle(vbState.startTimestamp ?? 0) ??
    defaultTitle;

  // current title
  const [currentMinutesTitle, setMinutesTitle] = useState(minutesTitle);
  useEffect(() => {
    setMinutesTitle(minutesTitle);
  }, [minutesTitle]);

  const handleChangeMinutesTitle = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setMinutesTitle(event.target.value);
  };

  const handleBlurMinutesTitle = (event: any) => {
    if (vbState.startTimestamp) {
      const title =
        currentMinutesTitle && currentMinutesTitle != ""
          ? currentMinutesTitle
          : defaultTitle;
      setMinutesTitle(title);
      useMinutesTitle.setMinutesTitle({
        title,
        startTimestamp: vbState.startTimestamp,
      });
    }
  };

  return (
    <FormControl className="ml-2 pt-2 w-48 ">
      <TextField
        value={currentMinutesTitle}
        variant="standard"
        onChange={handleChangeMinutesTitle}
        onBlur={handleBlurMinutesTitle}
        sx={{ input: { color: "white" } }}
      />
    </FormControl>
  );
};

const AssistantButton = (props: {}) => {
  const { detailViewDialog, renderDetailViewDialog, handleClose } =
    useDetailViewDialog();

  const handleClick = () => {
    detailViewDialog({
      content: <VirtualAssistantManager handleClose={handleClose} />,
      dialogConf: {
        //fullScreen: true,
        fullWidth: true,
      },
      dialogContentConf: {
        className: "m-0 p-0",
      },
    });
  };

  return (
    <>
      <Button onClick={handleClick} className="text-white mr-2">
        <SmartToyOutlined />
      </Button>
      {renderDetailViewDialog()}
    </>
  );
};

const OthersMenuButton = () => {
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const recording = useVBStore((state) => state.recording);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { confirmDialog, renderConfirmDialog } = useConfirmDialog();

  // menu popup
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(null);
  };

  // menu item events
  // download minutes
  const downloadMinutes = (targetMinutes: number) => {
    // Following stores should be snapshoted to download, so call getState().
    const minutesTitle = useMinutesTitleStore
      .getState()
      .getMinutesTitle(targetMinutes);
    const minutesStore = useMinutesStore(targetMinutes).getState();
    const assistantStore = useMinutesAssistantStore(targetMinutes).getState();
    const contentStore = useMinutesContentStore(targetMinutes).getState();

    if (minutesTitle && minutesStore && assistantStore && contentStore) {
      const zip = new JSZip();
      const results: JSZip[] = [];

      results.push(zip.file("minutesTitle.json", JSON.stringify(minutesTitle)));
      results.push(zip.file("minutesTitle.md", minutesTitle));

      // topics
      results.push(
        zip.file("topics.json", JSON.stringify(Array.from(minutesStore.topics)))
      );
      results.push(
        zip.file(
          "topics.md",
          Array.from(minutesStore.topics)
            .map((item) => {
              return `# ${item.title}\n\n${
                item.topic instanceof Array ? item.topic.join("\n") : item.topic
              }`;
            })
            .join("\n\n\n")
        )
      );

      // discussion
      results.push(
        zip.file("discussion.json", JSON.stringify(minutesStore.discussion))
      );
      results.push(
        zip.file(
          "discussion.md",
          Array.from(minutesStore.discussion)
            .map((discussionSegment) => {
              return `${discussionSegment.texts
                .map((text) => text.text)
                .join("\n")}`;
            })
            .join("\n\n")
        )
      );

      // contents
      results.push(
        zip.file("contents.json", JSON.stringify(contentStore.getAllContent()))
      );
      results.push(
        zip.file(
          "contents.md",
          contentStore
            .getAllContent()
            .map((content) => {
              return `${content.content}`;
            })
            .join("\n\n\n")
        )
      );

      // assistants
      assistantStore.assistantsMap.forEach((assistant) => {
        (assistant.messages ?? []).forEach((message) => {
          results.push(
            zip.file(
              `assistant/${assistant.vaConfig.assistantId}/${message.id}.json`,
              JSON.stringify(message)
            )
          );
          results.push(
            zip.file(
              `assistant/${assistant.vaConfig.assistantId}/${message.id}.md`,
              message.content
            )
          );
        });
      });

      console.log("DL: minutes", minutesStore);

      // debug
      if (true) {
        results.push(
          zip.file(
            "debug/minutesStore.json",
            JSON.stringify(minutesStore, ExpandJSONOptions.replacer)
          )
        );
        results.push(
          zip.file(
            "debug/assistantStore.json",
            JSON.stringify(assistantStore, ExpandJSONOptions.replacer)
          )
        );
        results.push(
          zip.file(
            "debug/VBReactflowStore.json",
            JSON.stringify(
              useVBReactflowStore.getState(),
              ExpandJSONOptions.replacer
            )
          )
        );
      }

      // construct contents
      Promise.all(results).then(() => {
        zip.generateAsync({ type: "blob" }).then((content) => {
          saveAs(content, `va_${targetMinutes}.zip`);
        });
      });
    }
  };

  // menu item events
  const handleBack = () => {
    setAnchorEl(null);
    processMinutesAction({
      type: "openHomeMenu",
    });
  };

  const handleDeleteMinutesWithConfirm = async () => {
    setAnchorEl(null);

    const { accepted } = await confirmDialog({
      content: (
        <>
          <div className="font-bold text-lg">Delete</div>
          <div className="p-4">
            Are you sure you want to delete this minutes?
          </div>
        </>
      ),
      acceptButtonLabel: "Delete",
      cancelButtonColor: "error",
    });

    if (!accepted) return; // キャンセル時は処理に進まない

    processMinutesAction({
      type: "deleteMinutes",
      payload: {
        startTimestamp: startTimestamp,
      },
    });
  };
  return (
    <div>
      <Button
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        disabled={recording}
        className="text-white"
      >
        <MenuIcon />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem onClick={handleBack}>
          <ListItemIcon>
            <Home fontSize="small" />
          </ListItemIcon>
          <ListItemText>Back</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => downloadMinutes(startTimestamp)}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={handleDeleteMinutesWithConfirm}
          className="text-red-500"
        >
          <ListItemIcon>
            <Delete fontSize="small" className="text-red-500" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      {renderConfirmDialog()}
    </div>
  );
};
