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
  Divider,
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
import { TranscribeController } from "./TranscribeController.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { useMinutesAssistantStore } from "../../store/useAssistantsStore.jsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { processMinutesAction } from "../../action/MinutesAction.js";
import { useNavigate } from "react-router-dom";
import { VBAvatar } from "../common/VBAvatar.jsx";
import {
  makeDefaultTitle,
  useVBTeamStore,
} from "../../store/useVBTeamStore.jsx";
import { DiscussionSplitter } from "../topic/DiscussionSplitter.jsx";

export const HeaderMainComponent = () => {
  const vbState = useVBStore((state) => state);
  const navigate = useNavigate();
  const handleOpenHome = () => {
    processMinutesAction({
      type: "openHomeMenu",
      payload: {
        navigate,
      },
    });

    navigate("/");
  };

  // team
  const team = useVBTeamStore((state) => state).getHydratedCurrentTeam();

  // user
  const user = team.members[0];
  const name = user.name;
  const avatarImage = user.avatarImage;

  return (
    <div className="border p-2 rounded flex items-center bg-indigo-950 h-16">
      <div onClick={handleOpenHome} className="mr-2">
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          disabled={vbState.recording}
          className="flex items-center space-x-2 mx-1"
        >
          <img
            src="./asset/va_logo_black.svg"
            className="mr-2 h-9 object-contain"
          />
          <VBAvatar
            name={team.name}
            avatarImage={team.avatarImage}
            variant="rounded"
            className="w-8 h-8"
          />
          <VBAvatar name={name} avatarImage={avatarImage} className="w-8 h-8" />
        </IconButton>
      </div>

      <div className="flex flex-row mr-2">
        <MinutesTitle />
        <div className="ml-4 flex flex-row text-xs items-center text-white/50">
          <AccessTime className="h-4 w-4 mr-2" />
          <div className="w-16">{formatTimestamp(vbState.startTimestamp)}</div>
        </div>
      </div>

      <Divider orientation="vertical" flexItem className="bg-white mx-2" />

      <DiscussionSplitter />
      <AssistantButton />
      <OthersMenuButton />

      <Divider orientation="vertical" flexItem className="bg-white mx-2" />

      <div className="ml-4 mr-4 flex flew-row items-center justify-center">
        <TranscribeController />
      </div>
    </div>
  );
};

const MinutesTitle = (props: {}) => {
  const vbState = useVBStore((state) => state);
  const useMinutesTitle = useVBTeamStore((state) => state);
  const defaultTitle = makeDefaultTitle(vbState.startTimestamp);
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
      <Button onClick={handleClick} className="text-white ">
        <SmartToyOutlined />
      </Button>
      {renderDetailViewDialog()}
    </>
  );
};

const OthersMenuButton = () => {
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const recording = useVBStore((state) => state.recording);
  const navigate = useNavigate();

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
    const minutesTitle = useVBTeamStore
      .getState()
      .getMinutesTitle(targetMinutes);
    const minutesStore = useMinutesStore(targetMinutes).getState();
    const assistantStore = useMinutesAssistantStore(targetMinutes).getState();

    if (minutesTitle && minutesStore && assistantStore) {
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
      payload: {
        navigate,
      },
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
        navigate,
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
