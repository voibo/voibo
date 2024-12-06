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
import { Add, Delete, Replay } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
  Tab,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  Dispatch,
  SyntheticEvent,
  useEffect,
  useReducer,
  useState,
} from "react";
import {
  AIConfig,
  AIConfigurator,
  DEFAULT_DIFY_CONF,
  DEFAULT_FLOWISE_CONF,
  DEFAULT_LANG_GRAPH_CONF,
} from "../common/aiConfig.jsx";
import { useConfirmDialog } from "../common/useConfirmDialog.jsx";

import Editor_ from "@monaco-editor/react";
import {
  TargetCategory,
  TargetClassification,
} from "../../../main/agent/agentManagerDefinition.js";
import {
  InvokeAssistantAttachOption,
  useMinutesAssistantStore,
  VirtualAssistantType,
  VirtualAssistantUpdateMode,
} from "../store/useAssistantsStore.jsx";
import { VFAction, VFState } from "../store/useVFStore.jsx";
import {
  AssistantConfigAction,
  AssistantConfigState,
} from "./VirtualAssistantManager.jsx";
import { AIAssistantAvatar } from "./message/AIAssistantAvatar.jsx";

import TabContext_ from "@mui/lab/TabContext";
import TabList_ from "@mui/lab/TabList";
import TabPanel_ from "@mui/lab/TabPanel";

const Editor = Editor_ as unknown as typeof Editor_.default;
const TabContext = TabContext_ as unknown as typeof TabContext_.default;
const TabList = TabList_ as unknown as typeof TabList_.default;
const TabPanel = TabPanel_ as unknown as typeof TabPanel_.default;

export type VirtualAssistantConfState = {
  aiConfig: AIConfig;
  assistantId: string;
  assistantName: string;
  icon: string;
  label: string;
  updateMode: VirtualAssistantUpdateMode;
  messageViewMode: "history" | "latest_response";
  initialPrompt: string;
  updatePrompt: string;
  attachOption: InvokeAssistantAttachOption;

  assistantType: VirtualAssistantType;

  targetClassification: TargetClassification;
  targetCategory: TargetCategory;
};
export type VirtualAssistantConfAction =
  | { type: "SET_ASSISTANT_TYPE"; payload: VirtualAssistantType }
  | { type: "SET_ASSISTANT_NAME"; payload: string }
  | { type: "SET_ICON"; payload: string }
  | { type: "SET_LABEL"; payload: string }
  | { type: "SET_UPDATE_MODE"; payload: VirtualAssistantUpdateMode }
  | { type: "SET_MESSAGE_VIEW_MODE"; payload: "history" | "latest_response" }
  | { type: "SET_INITIAL_PROMPT"; payload: string }
  | { type: "SET_UPDATE_PROMPT"; payload: string }
  | { type: "SET_ATTACH_OPTION"; payload: InvokeAssistantAttachOption }
  | { type: "SET_AI_CONFIG"; payload: AIConfig }
  | { type: "SET_TOPIC_CLASSIFICATION"; payload: TargetClassification }
  | { type: "SET_TOPIC_CATEGORY"; payload: TargetCategory };

export type VirtualAssistantConfDialogMode = "create" | "edit";
export const VirtualAssistantConfDialog = (props: {
  vfDispatch: Dispatch<VFAction>;
  vfState: VFState;
  dialogState: AssistantConfigState;
  dialogDispatch: Dispatch<AssistantConfigAction>;
}) => {
  const { dialogState, dialogDispatch, vfState, vfDispatch } = props;

  const mode = dialogState.dialogMode;
  if (!dialogState.assistantConfig) return <></>;

  const minutesStartTimestamp = vfState.startTimestamp;
  if (!minutesStartTimestamp) return <></>;

  const targetDispatch = useMinutesAssistantStore(minutesStartTimestamp)(
    (state) => state.assistantDispatch
  )(dialogState.assistantConfig);

  const [state, dispatch] = useReducer(
    (state: VirtualAssistantConfState, action: VirtualAssistantConfAction) => {
      switch (action.type) {
        case "SET_ASSISTANT_TYPE":
          return { ...state, assistantType: action.payload };
        case "SET_ASSISTANT_NAME":
          return { ...state, assistantName: action.payload };
        case "SET_ICON":
          return { ...state, icon: action.payload };
        case "SET_LABEL":
          return { ...state, label: action.payload };
        case "SET_UPDATE_MODE":
          return { ...state, updateMode: action.payload };
        case "SET_MESSAGE_VIEW_MODE":
          return { ...state, messageViewMode: action.payload };
        case "SET_INITIAL_PROMPT":
          return { ...state, initialPrompt: action.payload };
        case "SET_UPDATE_PROMPT":
          return { ...state, updatePrompt: action.payload };
        case "SET_ATTACH_OPTION":
          return { ...state, attachOption: action.payload };
        case "SET_AI_CONFIG":
          return { ...state, aiConfig: action.payload };
        case "SET_TOPIC_CLASSIFICATION":
          return { ...state, targetClassification: action.payload };
        case "SET_TOPIC_CATEGORY":
          return { ...state, targetCategory: action.payload };
        default:
          throw new Error("Unhandled action type");
      }
    },
    {
      assistantId: dialogState.assistantConfig.assistantId,
      assistantName: dialogState.assistantConfig.assistantName,
      icon: dialogState.assistantConfig.icon ?? "",
      label: dialogState.assistantConfig.label,
      updateMode: dialogState.assistantConfig.updateMode,
      messageViewMode: dialogState.assistantConfig.messageViewMode,
      initialPrompt: dialogState.assistantConfig.initialPrompt ?? "",
      updatePrompt: dialogState.assistantConfig.updatePrompt ?? "",
      attachOption: dialogState.assistantConfig.attachOption ?? {
        attachment: "none",
      },
      aiConfig: dialogState.assistantConfig.aiConfig ?? {
        systemPrompt: "",
        modelType: "gemini-1.5",
        temperature: 1,
        difyConf: DEFAULT_DIFY_CONF,
        flowiseConf: DEFAULT_FLOWISE_CONF,
        langGraphConf: DEFAULT_LANG_GRAPH_CONF,
      },

      assistantType: dialogState.assistantConfig.assistantType ?? "va-custom",
      targetClassification:
        dialogState.assistantConfig.targetClassification ?? "all",
      targetCategory: dialogState.assistantConfig.targetCategory ?? "Unknown",
    }
  );

  //console.log("VirtualAssistantConfDialog", state, dialogState, vfState);

  const isGeneralAssistant = state.assistantType == "va-general";
  //const isManualUpdateMode = state.updateMode == "manual";

  // handle close dialog
  const handleClose = () => {
    dialogDispatch({ type: "close" });
  };

  // delete confirm dialog
  const { confirmDialog, renderConfirmDialog } = useConfirmDialog();
  const handleDeleteAssistantWithConfirm = async () => {
    const { accepted } = await confirmDialog({
      content: (
        <>
          <div className="font-bold text-lg">Delete</div>
          <div className="p-4">
            Are you sure you want to delete this assistant?
          </div>
        </>
      ),
      acceptButtonLabel: "Delete",
      cancelButtonColor: "error",
    });
    if (!accepted) return; // キャンセル時は処理に進まな

    dialogDispatch({ type: "close" });
    if (!isGeneralAssistant) {
      vfDispatch({
        type: "removeVirtualAssistantConf",
        payload: {
          assistantId: state.assistantId,
        },
      });
    }
  };

  // handle update
  const handleUpdateAssistant = () => {
    console.log("handleUpdateAssistant", state);
    vfDispatch({
      type: "setVirtualAssistantConf",
      payload: {
        assistant: state,
      },
    });
    dialogDispatch({ type: "close" });
  };

  // handle create
  const handleCreateAssistant = () => {
    console.log("handleCreateAssistant", state);
    vfDispatch({
      type: "addVirtualAssistantConf",
      payload: {
        assistant: state,
      },
    });
    dialogDispatch({ type: "close" });
  };

  // action buttons
  let actionButtons = <></>;
  switch (mode) {
    case "create":
      actionButtons = (
        <Button
          color="primary"
          variant="outlined"
          onClick={handleCreateAssistant}
        >
          <Add />
        </Button>
      );
      break;
    case "edit":
      actionButtons = (
        <div className="flex items-center">
          <Button
            color="primary"
            variant="outlined"
            onClick={handleUpdateAssistant}
            className="mr-4"
          >
            Update
          </Button>
          {!isGeneralAssistant && (
            <Button
              color="error"
              variant="outlined"
              onClick={handleDeleteAssistantWithConfirm}
            >
              <Delete />
            </Button>
          )}
        </div>
      );
      break;
  }

  // tab
  const [selectedTab, setSelectedTab] = useState("1");
  const handleTabChange = (event: SyntheticEvent, newTab: string) => {
    setSelectedTab(newTab);
  };

  return (
    <Dialog open={dialogState.dialogOpen} onClose={handleClose}>
      <div className="grid grid-cols-1 gap-2 p-2">
        <div className="flex flex-col p-4 rounded border">
          {/** Header */}
          <div className="flex items-center">
            <AIAssistantAvatar label={state.label} icon={state.icon} />
            <Tooltip title={state.assistantId}>
              <span>　</span>
            </Tooltip>
            <div className="ml-4 flex flex-1">
              <TextField
                label=""
                value={state.label}
                variant="standard"
                fullWidth
                onChange={(event) => {
                  dispatch({ type: "SET_LABEL", payload: event.target.value });
                }}
              />
              <Button
                className="min-w-0 min-h-0 ml-2"
                onClick={() => {
                  if (vfState.startTimestamp && dialogState.assistantConfig) {
                    targetDispatch({
                      type: "initialize",
                      payload: {
                        startTimestamp: vfState.startTimestamp,
                        assistantName:
                          dialogState.assistantConfig.assistantName,
                      },
                    });
                    dialogDispatch({ type: "close" });
                  }
                }}
              >
                <Replay sx={{ fontSize: "1rem" }} />
              </Button>
            </div>
            <div className="ml-4 flex flex-0">{actionButtons}</div>
          </div>

          <TabContext value={selectedTab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={handleTabChange}>
                <Tab label="Target" value="1" />
                <Tab label="LLM" value="2" />
                <Tab label="GUI" value="3" />
              </TabList>
            </Box>
            <TabPanel value="1">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <Tooltip title="Assistant update timing">
                    <div>Update mode</div>
                  </Tooltip>
                </div>
                <div className="col-span-3">
                  <FormControl fullWidth>
                    <InputLabel id="llmModel">Update mode</InputLabel>
                    <UpdateModeSelector
                      selectedVAUpdateMode={state.updateMode}
                      onSelectVAUpdateMode={(event) => {
                        // update mode
                        const updateMode = event.target
                          .value as VirtualAssistantUpdateMode;
                        dispatch({
                          type: "SET_UPDATE_MODE",
                          payload: updateMode,
                        });
                        // attachment option
                        dispatch({
                          type: "SET_ATTACH_OPTION",
                          payload: detectInvokeAssistantAttachOption(
                            detectAttachmentType(updateMode, state.attachOption)
                          ),
                        });
                      }}
                      label="Update Mode"
                    />
                  </FormControl>
                </div>

                <div className="col-span-1">
                  <Tooltip title="Target by classification. If agenda related update mode selected, this is for agenda itself.">
                    <div>Target Classification</div>
                  </Tooltip>
                </div>
                <div className="col-span-3">
                  <FormControl fullWidth>
                    <InputLabel id="llmModel">Target Classification</InputLabel>
                    <TopicClassificationSelector
                      selectedTopicClassification={state.targetClassification}
                      onSelectTopicClassification={(event) => {
                        dispatch({
                          type: "SET_TOPIC_CLASSIFICATION",
                          payload: event.target.value as TargetClassification,
                        });
                      }}
                      label="Topic Classification"
                    />
                  </FormControl>
                </div>

                <div className="col-span-1">
                  <Tooltip title="Target by category. If agenda related update mode selected, this is for agenda itself.">
                    <div>Target Category</div>
                  </Tooltip>
                </div>
                <div className="col-span-3">
                  <FormControl fullWidth>
                    <InputLabel id="llmModel">Target Category</InputLabel>
                    <TopicCategorySelector
                      selectedTopicCategory={state.targetCategory}
                      onSelectTopicCategory={(event) => {
                        dispatch({
                          type: "SET_TOPIC_CATEGORY",
                          payload: event.target.value as TargetCategory,
                        });
                      }}
                      label="Topic Category"
                    />
                  </FormControl>
                </div>

                {!isGeneralAssistant && (
                  <UserSelectableAssistantPart
                    state={state}
                    dispatch={dispatch}
                  />
                )}
              </div>
            </TabPanel>
            <TabPanel value="2">
              <LLMConfigPart state={state} dispatch={dispatch} />
            </TabPanel>
            <TabPanel value="3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <Tooltip title="Structured output schema of zod. It's used for {format_instructions}. Must use with Output React Component.">
                    <div>Structured Output</div>
                  </Tooltip>
                </div>
                <div className="col-span-3">
                  <Editor
                    height={"15rem"}
                    width={"100%"}
                    language="javascript"
                    value={state.aiConfig.structuredOutputSchema}
                    theme="vs-dark"
                    onChange={(value) => {
                      dispatch({
                        type: "SET_AI_CONFIG",
                        payload: {
                          ...state.aiConfig,
                          structuredOutputSchema: value,
                        },
                      });
                    }}
                  />
                </div>

                <div className="col-span-1">
                  <Tooltip
                    title={`React component to apply Structured Output. Only JSX is supported.
            bindings={{
              output: output,
              topicIDs: topicIDs,
              assistantConfig: assistantConfig,
            }}
            components={{
              VAMessageLayout,
              AIAssistantAvatar,
            }}
                  `}
                  >
                    <div>React Component for Structured Output</div>
                  </Tooltip>
                </div>
                <div className="col-span-3">
                  <Editor
                    height={"15rem"}
                    width={"100%"}
                    language="javascript"
                    value={state.aiConfig.reactComponent}
                    theme="vs-dark"
                    onChange={(value) => {
                      dispatch({
                        type: "SET_AI_CONFIG",
                        payload: {
                          ...state.aiConfig,
                          reactComponent: value,
                        },
                      });
                    }}
                  />
                </div>

                <div className="col-span-1">
                  <Tooltip title="Avatar image url of assistant">
                    <div>Avatar URL</div>
                  </Tooltip>
                </div>
                <div className="col-span-3">
                  <TextField
                    label="Avatar URL"
                    value={state.icon}
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={(event) => {
                      dispatch({
                        type: "SET_ICON",
                        payload: event.target.value,
                      });
                    }}
                  />
                </div>
              </div>
            </TabPanel>
          </TabContext>
        </div>
      </div>
      {renderConfirmDialog()}
    </Dialog>
  );
};

export const LLMConfigPart = (props: {
  state: VirtualAssistantConfState;
  dispatch: Dispatch<VirtualAssistantConfAction>;
}) => {
  const { state, dispatch } = props;
  return (
    <div className="grid grid-cols-4 gap-3">
      {state.aiConfig.modelType !== "langGraph" && (
        <>
          <div className="col-span-1">
            <Tooltip title="Prompts to determine assistant role">
              <div>System Prompt</div>
            </Tooltip>
          </div>
          <div className="col-span-3">
            <TextField
              label="Initial Prompt"
              value={state.initialPrompt}
              variant="outlined"
              multiline
              minRows={4}
              fullWidth
              onChange={(event) => {
                dispatch({
                  type: "SET_INITIAL_PROMPT",
                  payload: event.target.value,
                });
              }}
            />
          </div>

          <div className="col-span-1">
            <Tooltip title="Prompt to automatically check each time a topic is updated">
              <div>Update Prompt</div>
            </Tooltip>
          </div>
          <div className="col-span-3">
            <TextField
              label="Update Prompt"
              value={state.updatePrompt}
              variant="outlined"
              multiline
              minRows={1}
              fullWidth
              onChange={(event) => {
                dispatch({
                  type: "SET_UPDATE_PROMPT",
                  payload: event.target.value,
                });
              }}
            />
          </div>
        </>
      )}

      <AIConfigurator
        initConf={state.aiConfig}
        handler={(newState) => {
          dispatch({
            type: "SET_AI_CONFIG",
            payload: newState,
          });
        }}
      />
    </div>
  );
};

const UpdateModeSelector = (
  props: {
    selectedVAUpdateMode: VirtualAssistantUpdateMode;
    onSelectVAUpdateMode: (event: SelectChangeEvent<any>) => void;
    label?: string;
  } & SelectProps<any>
) => {
  const { selectedVAUpdateMode, onSelectVAUpdateMode, label, ...rest } = props;
  const selectorMenuItems = [
    {
      value: "at_agenda_completed",
      label: "Agenda Completed",
      detail1: "It is updated when the targeted agenda is changed to other.",
      detail2:
        "All topics related to the target agenda will be used as content.",
    },
    {
      value: "at_agenda_updated",
      label: "Agenda related each Topic updated",
      detail1:
        "It is updated each time a topic is added to the targeted agenda.",
      detail2: "Topics related to the target agenda will be used as content.",
    },
    {
      value: "at_topic_updated",
      label: "Each Topic updated",
      detail1: "It is updated each time a targeted Topic is added.",
      detail2: "Individual topics are used as content.",
    },
    {
      value: "manual",
      label: "Manual",
      detail1: "Updated when the user selects and executes the target.",
      detail2: "Selected topics / assistant results are used as content.",
    },
  ];
  return (
    <Select
      labelId="updateMode"
      value={selectedVAUpdateMode}
      label={label}
      onChange={onSelectVAUpdateMode}
      size="small"
      {...rest}
    >
      {selectorMenuItems.map((option, index) => (
        <MenuItem value={option.value} key={index}>
          <div className="flex flex-col">
            <div>{option.label}</div>
            <div className="text-xs">{option.detail1}</div>
            <div className="text-xs">{option.detail2}</div>
          </div>
        </MenuItem>
      ))}
    </Select>
  );
};

const TopicClassificationSelector = (
  props: {
    selectedTopicClassification: TargetClassification;
    onSelectTopicClassification: (event: SelectChangeEvent<any>) => void;
    label?: string;
  } & SelectProps<any>
) => {
  const {
    selectedTopicClassification,
    onSelectTopicClassification,
    label,
    ...rest
  } = props;
  return (
    <Select
      labelId="topicClassification"
      value={selectedTopicClassification}
      label={label}
      onChange={onSelectTopicClassification}
      size="small"
      {...rest}
    >
      {TargetClassification.map((value, index) => (
        <MenuItem value={value} key={index}>
          <div className="flex flex-col">
            <div>{value}</div>
          </div>
        </MenuItem>
      ))}
    </Select>
  );
};

const TopicCategorySelector = (
  props: {
    selectedTopicCategory: TargetCategory;
    onSelectTopicCategory: (event: SelectChangeEvent<any>) => void;
    label?: string;
  } & SelectProps<any>
) => {
  const { selectedTopicCategory, onSelectTopicCategory, label, ...rest } =
    props;
  return (
    <Select
      labelId="topicCategory"
      value={selectedTopicCategory}
      label={label}
      onChange={onSelectTopicCategory}
      size="small"
      {...rest}
    >
      {TargetCategory.map((value, index) => (
        <MenuItem value={value} key={index}>
          <div className="flex flex-col">
            <div>{value}</div>
          </div>
        </MenuItem>
      ))}
    </Select>
  );
};

type AttachmentType =
  | "topic_systemFiltered"
  | "topic_manualSelected"
  | "topic_latest"
  | "topic_origin_systemFiltered"
  | "topic_origin_manualSelected"
  | "topic_origin_latest"
  | "none";

function detectAttachmentType(
  updateMode: VirtualAssistantUpdateMode,
  option?: InvokeAssistantAttachOption
): AttachmentType {
  switch (option?.attachment) {
    case "topic":
      switch (updateMode) {
        case "at_topic_updated":
          return "topic_latest";
        case "at_agenda_completed":
        case "at_agenda_updated":
          return "topic_systemFiltered";
        case "manual":
          return "topic_manualSelected";
      }
    case "discussion":
      switch (updateMode) {
        case "at_topic_updated":
          return "topic_origin_latest";
        case "at_agenda_completed":
        case "at_agenda_updated":
          return "topic_origin_systemFiltered";
        case "manual":
          return "topic_origin_manualSelected";
      }
    case "none":
    default:
      return "none";
  }
}

function makeAttachmentOptions(updateMode: VirtualAssistantUpdateMode): Array<{
  value: AttachmentType;
  label: string;
}> {
  let topicValue: AttachmentType = "none";
  switch (updateMode) {
    case "at_agenda_completed":
    case "at_agenda_updated":
      topicValue = "topic_systemFiltered";
      break;
    case "at_topic_updated":
      topicValue = "topic_latest";
      break;
    case "manual":
      topicValue = "topic_manualSelected";
      break;
  }
  let discussionValue: AttachmentType = "none";
  switch (updateMode) {
    case "at_agenda_completed":
    case "at_agenda_updated":
      discussionValue = "topic_origin_systemFiltered";
      break;
    case "at_topic_updated":
      discussionValue = "topic_origin_latest";
      break;
    case "manual":
      discussionValue = "topic_origin_manualSelected";
      break;
  }
  return [
    {
      value: topicValue,
      label: "Topic itself",
    },
    {
      value: discussionValue,
      label: "Original Discussion of topic",
    },
  ];
}

function detectInvokeAssistantAttachOption(
  value: AttachmentType
): InvokeAssistantAttachOption {
  let payload: InvokeAssistantAttachOption = {
    attachment: "topic",
    target: "latest",
  };
  switch (value) {
    case "topic_latest":
      break;
    case "topic_systemFiltered":
      payload = {
        attachment: "topic",
        target: "systemFiltered",
      };
      break;
    case "topic_origin_latest":
      payload = {
        attachment: "discussion",
        target: "latest",
      };
      break;
    case "topic_origin_systemFiltered":
      payload = {
        attachment: "discussion",
        target: "systemFiltered",
      };
      break;
    case "topic_manualSelected":
      payload = {
        attachment: "topic",
        target: "manualSelected",
      };
      break;
    case "topic_origin_manualSelected":
      payload = {
        attachment: "discussion",
        target: "manualSelected",
      };
      break;
  }
  return payload;
}

const UserSelectableAssistantPart = (props: {
  state: VirtualAssistantConfState;
  dispatch: Dispatch<VirtualAssistantConfAction>;
}) => {
  const { state, dispatch } = props;

  const handleAttachedContentChange = (event: SelectChangeEvent<any>) => {
    dispatch({
      type: "SET_ATTACH_OPTION",
      payload: detectInvokeAssistantAttachOption(
        event.target.value as AttachmentType
      ),
    });
  };

  // attachment options
  let attachmentOptions = makeAttachmentOptions(state.updateMode);
  let attachmentType = detectAttachmentType(
    state.updateMode,
    state.attachOption
  );
  useEffect(() => {
    attachmentOptions = makeAttachmentOptions(state.updateMode);
    attachmentType = detectAttachmentType(state.updateMode, state.attachOption);
  }, [state.updateMode]);

  return (
    <>
      <div className="col-span-1">
        <Tooltip title="Content to be provided as a conversation each time the topic is updated">
          <div>Attached Content</div>
        </Tooltip>
      </div>
      <div className="col-span-3">
        <FormControl fullWidth>
          <InputLabel id="attachedContent">Attached Content</InputLabel>
          <Select
            labelId="attachedContent"
            value={attachmentType}
            label="Attached Content"
            onChange={handleAttachedContentChange}
          >
            {attachmentOptions.map((option, index) => (
              <MenuItem value={option.value} key={index}>
                <div className="flex flex-col">
                  <div>{option.label}</div>
                </div>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </>
  );
};
