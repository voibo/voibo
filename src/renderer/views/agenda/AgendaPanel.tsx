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
import { Add, ExpandLess, ExpandMore, ViewAgenda } from "@mui/icons-material";
import { Button } from "@mui/material";
import { enableMapSet } from "immer";
import { useEffect, useState } from "react";
import { Agenda, useAgendaStore } from "../store/useAgendaStore.jsx";
enableMapSet();

import { useDetailViewDialog } from "../common/useDetailViewDialog.jsx";
import { getDefaultContent } from "../store/Content.js";
import { AgendaEditView } from "./AgendaEditView.jsx";
import { AgendaReadableView } from "./AgendaReadableView.jsx";

export const AgendaPanel = (props: {}) => {
  const agendasStore = useAgendaStore((state) => state);
  const agendaList: Array<{ agenda: Agenda; isNext: boolean }> = [];
  let nextIndex = -1;
  agendasStore.getAllAgendas().forEach((agenda, index) => {
    // next は　一番最初の未完了のアジェンダ
    if (agenda.status === "waiting" && nextIndex === -1) {
      nextIndex = index;
    }
    agendaList.push({
      agenda: agenda,
      isNext: index === nextIndex,
    });
  });

  const handleAdd = () => {
    const agenda = getDefaultContent();
    agendasStore.setAgenda({
      ...agenda,
      type: "agenda",
      title: "New Agenda",
      detail: "",
      classification: "all",
      category: "Unknown",
      status: "waiting",
      discussedTimes: [],
      width: 200, // TODO: set width
    });
  };

  // expand
  const [expand, setExpand] = useState(true);
  const handleExpand = () => {
    setExpand(!expand);
  };

  return (
    <div className="p-1 rounded flex flex-col border border-white bg-indigo-950 text-white">
      <div className="relative flex flex-row items-center">
        <div className="flex-grow flex flex-row items-center">
          <ViewAgenda className="mr-2" />
          <span>Agenda</span>
        </div>
        <div className="flex-grow-0">
          <Button className="min-w-0 min-h-0 text-white" onClick={handleExpand}>
            {expand ? (
              <ExpandLess sx={{ fontSize: "1rem" }} />
            ) : (
              <ExpandMore sx={{ fontSize: "1rem" }} />
            )}
          </Button>
        </div>
      </div>
      {expand && (
        <div className="w-full max-h-100 overflow-y-scroll">
          {agendaList.map((agenda) => {
            return (
              <AgendaElement
                key={agenda.agenda.id}
                agenda={agenda.agenda}
                isNext={agenda.isNext}
              ></AgendaElement>
            );
          })}

          <div className="border border-dashed rounded ">
            <Button
              className="w-full min-w-0 min-h-0 text-white"
              onClick={handleAdd}
            >
              <Add sx={{ fontSize: "1rem" }} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AgendaElement = (props: { agenda: Agenda; isNext: boolean }) => {
  const { agenda, isNext } = props;
  const [editMode, setEditMode] = useState(false);
  const { detailViewDialog, renderDetailViewDialog, handleClose } =
    useDetailViewDialog();

  useEffect(() => {
    if (editMode) {
      detailViewDialog({
        content: <AgendaEditView agenda={agenda} setEditMode={setEditMode} />,
        dialogConf: {
          fullWidth: true,
          maxWidth: "sm",
        },
        onClose: () => setEditMode(false),
      });
    } else {
      handleClose();
    }
  }, [editMode]);

  return (
    <div key={agenda.id} className="my-1">
      <AgendaReadableView
        agenda={agenda}
        setEditMode={setEditMode}
        isNext={isNext}
      />
      {renderDetailViewDialog()}
    </div>
  );
};
