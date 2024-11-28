/*
Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect

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
import { Button, Dialog, DialogActions, DialogContent } from "@mui/material";
import { ReactNode, useCallback, useState } from "react";

type State = {
  content: ReactNode;
  onClose: ConfirmDialogProps["onClose"];
  acceptButtonLabel: ReactNode;
  cancelButtonColor?: "inherit" | "primary" | "secondary" | "error";
};

type OpenModalResult = Parameters<State["onClose"]>[0];

type ReturnValues = {
  confirmDialog: (props: Omit<State, "onClose">) => Promise<OpenModalResult>;
  renderConfirmDialog: () => ReactNode;
};

export const useConfirmDialog = (): ReturnValues => {
  const [state, setState] = useState<State | undefined>(undefined);

  const confirmDialog: ReturnValues["confirmDialog"] = useCallback(
    (props) =>
      new Promise((resolve) => {
        setState({ ...props, onClose: resolve });
      }),
    []
  );

  const handleClose: State["onClose"] = useCallback(
    (options) => {
      state?.onClose(options);
      setState(undefined);
    },
    [state]
  );

  const renderConfirmDialog: ReturnValues["renderConfirmDialog"] = () => {
    return (
      <ConfirmDialog
        open={!!state}
        onClose={handleClose}
        content={state?.content}
        acceptButtonLabel={state?.acceptButtonLabel}
        cancelButtonColor={state?.cancelButtonColor}
      />
    );
  };

  return {
    confirmDialog,
    renderConfirmDialog,
  };
};

// Dialog View

export type ConfirmDialogProps = {
  open: boolean;
  content: ReactNode;
  onClose: (options: { accepted: boolean }) => void;
  acceptButtonLabel: ReactNode;
  cancelButtonColor?: "inherit" | "primary" | "secondary" | "error";
};

/**
 * 確認Dialog
 *
 * あくまで確認を実行するだけなので、確認している内容についてはDialogを使う側で保持すること
 */
export const ConfirmDialog = ({
  open,
  content,
  onClose,
  acceptButtonLabel,
  cancelButtonColor,
}: ConfirmDialogProps) => {
  const handleCancel = useCallback(() => {
    onClose({ accepted: false });
  }, [onClose]);

  const handleAccept = useCallback(() => {
    onClose({ accepted: true });
  }, [onClose]);

  return (
    <Dialog open={open} maxWidth="xs" onClose={handleCancel}>
      <DialogContent>{content}</DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          color={cancelButtonColor}
          onClick={handleAccept}
        >
          {acceptButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
