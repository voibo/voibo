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
  Monitor,
  PhoneDisabled,
  PhoneEnabled,
  VideocamOutlined,
  WebAsset,
} from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogContent,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useTranscribeStore } from "../../store/useTranscribeStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { IPCInvokeKeys, IPCSenderKeys } from "../../../../common/constants.js";
import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { MediaCaptureTarget } from "@voibo/desktop-media-capture";
import { truncateText } from "../../../util.js";

export const TranscribeController = () => {
  const recording = useVBStore((state) => state.recording);
  const transcriber = useTranscribeStore((state) => state);

  const [captureTargets, setCaptureTargets] = useState<MediaCaptureTarget[]>(
    []
  );
  const [selectedCaptureTarget, setSelectedCaptureTarget] =
    useState<MediaCaptureTarget | null>(null);

  // initialize MediaCapture
  useEffect(() => {
    window.electron
      .invoke(IPCInvokeKeys.ENUM_MEDIA_CAPTURE_TARGETS)
      .then((res: MediaCaptureTarget[]) => {
        if (res.length > 0 && res[0].isDisplay) {
          console.log("ENUM_MEDIA_CAPTURE_TARGETS", res);
          setCaptureTargets(res);
          setSelectedCaptureTarget(res[0]);
        }
      });
  }, []);

  // select capture target
  const [open, setOpen] = useState(false);

  // NOTE: Tailwind css does not support dynamic class names
  return (
    <>
      {recording ? (
        <Button
          className=" text-red-400 border-red-600 bg-red-600/20 border-2 hover:bg-red-600/50"
          variant="outlined"
          onClick={
            !recording ? () => setOpen(true) : transcriber.stopTranscribe
          }
        >
          <div className="flex items-center justify-center rounded-full h-10 w-10 border-0">
            <PhoneDisabled className="text-red-600 text-3xl" />
          </div>
          {selectedCaptureTarget && (
            <div className="ml-4 text-xs text-white">
              {makeCaptureTargetName(selectedCaptureTarget)}
            </div>
          )}
        </Button>
      ) : (
        <Button
          className=" text-emerald-400 border-emerald-600 bg-emerald-600/20 border-2 hover:bg-emerald-600/50"
          variant="outlined"
          onClick={
            !recording ? () => setOpen(true) : transcriber.stopTranscribe
          }
        >
          <div className="flex items-center justify-center rounded-full h-10 w-10 border-0">
            <PhoneEnabled className="text-emerald-400 text-3xl" />
          </div>
          {selectedCaptureTarget && (
            <div className="ml-4 text-xs text-white">
              {makeCaptureTargetName(selectedCaptureTarget)}
            </div>
          )}
        </Button>
      )}
      <SelectCaptureTargetDialog
        open={open}
        setOpen={setOpen}
        captureTargets={captureTargets}
        setCaptureTargets={setCaptureTargets}
        selectedCaptureTarget={selectedCaptureTarget}
        setSelectedCaptureTarget={setSelectedCaptureTarget}
      />
    </>
  );
};

// CaptureTarget util function

const DELIMITER = ":";

const encodeCaptureTargetValue = (target: MediaCaptureTarget): string => {
  return `${target.isDisplay}${DELIMITER}${
    target.isDisplay ? String(target.displayId) : String(target.windowId)
  }`;
};

const decodeCaptureTargetValue = (
  value: string,
  captureTargets: MediaCaptureTarget[]
): MediaCaptureTarget | undefined => {
  const [isDisplay, id] = value.split(DELIMITER);
  if (isDisplay === "true") {
    return captureTargets.find((target) => target.displayId === Number(id));
  } else {
    return captureTargets.find((target) => target.windowId === Number(id));
  }
};

const makeCaptureTargetName = (target: MediaCaptureTarget) => {
  let icon: ReactNode;
  let fullName: string;

  if (target.isDisplay) {
    icon = <Monitor className="mr-4 h-4 w-4" />;
    fullName = target.title ?? "";
  } else {
    icon = <WebAsset className="mr-4 h-4 w-4" />;
    fullName = target.applicationName + "\u00A0\u00A0" + target.title;
  }

  return (
    <div className="flex items-center">
      {icon}
      <span title={fullName} className="overflow-hidden text-ellipsis">
        {truncateText(fullName, 30)}
      </span>
    </div>
  );
};

const SelectCaptureTargetDialog = (props: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  captureTargets: MediaCaptureTarget[];
  setCaptureTargets: Dispatch<SetStateAction<MediaCaptureTarget[]>>;
  selectedCaptureTarget: MediaCaptureTarget | null;
  setSelectedCaptureTarget: Dispatch<SetStateAction<MediaCaptureTarget | null>>;
}) => {
  const {
    open,
    setOpen,
    selectedCaptureTarget,
    setSelectedCaptureTarget,
    captureTargets,
    setCaptureTargets,
  } = props;

  const transcriber = useTranscribeStore((state) => state);

  // close dialog
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
  };

  const handleCaptureTargetSelected = (e: SelectChangeEvent) => {
    const target = decodeCaptureTargetValue(e.target.value, captureTargets);
    if (target) {
      setSelectedCaptureTarget(target);
    }
  };

  const handleStartClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if (selectedCaptureTarget) {
      console.log("start capture", selectedCaptureTarget);

      window.electron
        .invoke(
          IPCInvokeKeys.SCREEN_CAPTURE_TARGET_SELECTED,
          selectedCaptureTarget.isDisplay,
          selectedCaptureTarget.isDisplay
            ? selectedCaptureTarget.displayId
            : selectedCaptureTarget.windowId
        )
        .then(() => {
          // start transcribe ;
          transcriber.startTranscribe();
        })
        .finally(() => {
          // close dialog
          setOpen(false);
        });
    }
  };

  useEffect(() => {
    window.electron
      .invoke(IPCInvokeKeys.ENUM_MEDIA_CAPTURE_TARGETS)
      .then((res: MediaCaptureTarget[]) => {
        if (res.length > 0) {
          setCaptureTargets(res);
        }
      });
  }, [open]);

  return (
    selectedCaptureTarget && (
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <div className="flex flex-col items-center">
            <div className="text-lg items-start w-full mb-2">
              Capture Target
            </div>
            <FormControl fullWidth>
              <div className="flex flex-row items-center w-full my-4 mb-4">
                <div className="mr-4">
                  <VideocamOutlined></VideocamOutlined>
                </div>
                <Select
                  value={encodeCaptureTargetValue(selectedCaptureTarget)}
                  label=""
                  onChange={handleCaptureTargetSelected}
                >
                  {captureTargets.map((config: MediaCaptureTarget, index) => {
                    return (
                      <MenuItem
                        key={index}
                        value={encodeCaptureTargetValue(config)}
                      >
                        {makeCaptureTargetName(config)}
                      </MenuItem>
                    );
                  })}
                </Select>
              </div>
              <Button
                className="mt-2 text-white border-emerald-600 bg-emerald-600 hover:bg-emerald-600/75"
                variant="outlined"
                onClick={handleStartClick}
              >
                <PhoneEnabled className="mr-2" />
                start
              </Button>
            </FormControl>
          </div>
        </DialogContent>
      </Dialog>
    )
  );
};
