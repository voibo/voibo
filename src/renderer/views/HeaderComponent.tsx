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
import React, { ChangeEvent, Dispatch, useEffect, useState } from "react";
import { formatTimestamp } from "../util.js";
import { VirtualAssistantManager } from "./assistant/VirtualAssistantManager.jsx";
import { useConfirmDialog } from "./common/useConfirmDialog.jsx";
import { useDetailViewDialog } from "./common/useDetailViewDialog.jsx";
import { useVFStore, VBAction, VBState } from "./store/useVFStore.jsx";
import { TranscribeButton } from "./TranscribeButton.jsx";
import { useDownloadMinutes } from "./VFPage.jsx";
import { useMinutesTitleStore } from "./store/useMinutesTitle.jsx";

export const HeaderComponent = () => {
  const vfState = useVFStore((state) => state);
  const vfDispatch = useVFStore((state) => state.vfDispatch);

  const handleOpenHome = () => {
    vfDispatch({
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
            ...(vfState.mainMenuOpen && { display: "none" }),
          }}
          className="mr-2"
          disabled={vfState.recording}
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
              {formatTimestamp(vfState.startTimestamp)}
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
        <OthersMenuButton state={vfState} dispatch={vfDispatch} />
      </div>
    </div>
  );
};

const MinutesTitle = (props: {}) => {
  const vfState = useVFStore((state) => state);
  const useMinutesTitle = useMinutesTitleStore((state) => state);
  const defaultTitle = `会議: ${formatTimestamp(vfState.startTimestamp)}`;
  let minutesTitle =
    useMinutesTitle.getMinutesTitle(vfState.startTimestamp ?? 0) ??
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
    if (vfState.startTimestamp) {
      const title =
        currentMinutesTitle && currentMinutesTitle != ""
          ? currentMinutesTitle
          : defaultTitle;
      setMinutesTitle(title);
      useMinutesTitle.setMinutesTitle({
        title,
        startTimestamp: vfState.startTimestamp,
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

const OthersMenuButton = (props: {
  state: VBState;
  dispatch: Dispatch<VBAction>;
}) => {
  const { state, dispatch } = props;
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
  const useMinutesTitle = useMinutesTitleStore.getState();
  const downloadMinutes = useDownloadMinutes(useMinutesTitle);

  // menu item events
  const handleBack = () => {
    setAnchorEl(null);
    dispatch({
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

    dispatch({
      type: "deleteMinutes",
      payload: {
        startTimestamp: state.startTimestamp ?? 0,
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
        disabled={state.recording}
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
        <MenuItem
          onClick={() => {
            downloadMinutes(state.startTimestamp ?? 0);
          }}
        >
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
