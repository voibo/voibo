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
  Dialog,
  DialogContent,
  DialogContentProps,
  DialogProps,
} from "@mui/material";
import { ReactNode, useCallback, useState } from "react";

type ReturnValues = {
  detailViewDialog: (props: DetailViewDialogState) => void;
  renderDetailViewDialog: () => ReactNode;
  handleClose: () => void;
};

export type DetailViewDialogState = {
  content: ReactNode;
  dialogConf?: Omit<DialogProps, "open">;
  dialogContentConf?: Omit<DialogContentProps, "children">;
  onClose?: () => void;
};

export const useDetailViewDialog = (): ReturnValues => {
  const [state, setState] = useState<DetailViewDialogState | undefined>(
    undefined
  );

  const detailViewDialog: ReturnValues["detailViewDialog"] = useCallback(
    (props) => {
      setState({ ...props });
    },
    []
  );

  const handleClose: ReturnValues["handleClose"] = useCallback(() => {
    if (state && state.onClose) {
      state.onClose();
    }
    setState(undefined);
  }, [state]);

  const renderDetailViewDialog: ReturnValues["renderDetailViewDialog"] = () => {
    return (
      <DetailViewDialog
        open={!!state}
        onClose={handleClose}
        content={state?.content}
        dialogConf={state?.dialogConf}
        dialogContentConf={state?.dialogContentConf}
      />
    );
  };

  return {
    detailViewDialog,
    renderDetailViewDialog,
    handleClose,
  };
};

// Dialog View

export type DetailViewDialogProps = {
  open: boolean;
  content: ReactNode;
  dialogConf?: Omit<DialogProps, "open" | "onClose">;
  onClose: () => void;
  dialogContentConf?: Omit<DialogContentProps, "children">;
};

/**
 * 詳細表示専用Dialog
 */
export const DetailViewDialog = ({
  open,
  content,
  dialogConf,
  onClose,
  dialogContentConf,
}: DetailViewDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} {...dialogConf}>
      <DialogContent {...dialogContentConf}>{content}</DialogContent>
    </Dialog>
  );
};
