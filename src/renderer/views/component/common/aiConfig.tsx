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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SelectProps,
  Slider,
  TextField,
  Tooltip,
} from "@mui/material";
import { useReducer } from "react";
import {
  DifyConf,
  FlowiseConf,
  LangGraphConf,
  ModelType,
} from "../../../../common/content/assisatant.js";

export type AIConfig = AIConfigCore & {
  systemPrompt: string;
  structuredOutputSchema?: string;
  reactComponent?: string;
};
export type AIConfigCore = {
  modelType: ModelType;
  temperature: number;
  difyConf?: DifyConf;
  flowiseConf?: FlowiseConf;
  langGraphConf?: LangGraphConf;
  attachHistoryLimit?: number;
};

export const AIModelSelector = (
  props: {
    selectedModel: ModelType;
    onSelectModel: (event: SelectChangeEvent<any>) => void;
    label?: string;
  } & SelectProps<any>
) => {
  const { selectedModel, onSelectModel, label, ...rest } = props;
  return (
    <Select
      labelId="llmModel"
      value={selectedModel}
      label={label}
      onChange={onSelectModel}
      size="small"
      {...rest}
    >
      {Array.from(ModelType.values()).map((option, index) => (
        <MenuItem value={option.value} key={index}>
          <div className="flex flex-col">
            <div>{option.label}</div>
          </div>
        </MenuItem>
      ))}
    </Select>
  );
};

export const AITemperatureSelector = (props: {
  temperature: number;
  onTemperatureChange: (
    event: Event,
    value: number | number[],
    activeThumb: number
  ) => void;
  onChangeCommitted?: (
    event: React.SyntheticEvent | Event,
    value: number | number[]
  ) => void;
}) => {
  const { temperature, onTemperatureChange, onChangeCommitted } = props;
  return (
    <Slider
      aria-label="temperature"
      defaultValue={0}
      value={temperature}
      valueLabelDisplay="auto"
      shiftStep={0.1}
      step={0.1}
      min={0}
      max={1}
      marks
      onChange={onTemperatureChange}
      size="small"
      className="mt-4"
      onChangeCommitted={onChangeCommitted}
    />
  );
};

export const DEFAULT_DIFY_CONF: DifyConf = {
  apiKey: "",
  serverUrl: "http://localhost/v1/workflows/run",
};

export const DEFAULT_FLOWISE_CONF: FlowiseConf = {
  apiKey: "",
  chatFlowID: "",
};

export const DEFAULT_LANG_GRAPH_CONF: LangGraphConf = {
  langGraphID: "agenda_summarizer",
};

type AIConfigAction =
  | {
      type: "SET_MODEL_TYPE";
      payload: ModelType;
    }
  | {
      type: "SET_DIFY_CONFIG";
      payload: DifyConf | undefined;
    }
  | {
      type: "SET_FLOWISE_CONFIG";
      payload: FlowiseConf | undefined;
    }
  | {
      type: "SET_LANG_GRAPH_CONFIG";
      payload: LangGraphConf | undefined;
    }
  | {
      type: "SET_TEMPERATURE";
      payload: number;
    }
  | {
      type: "AI_CONFIG_IS_CHANGED";
    }
  | {
      type: "SET_ATTACH_HISTORY_LIMIT";
      payload: number;
    };

export const AIConfigurator = (props: {
  initConf: AIConfig;
  handler: (newConfig: AIConfig) => void;
}) => {
  //console.log("AIConfigurator", props);
  const { handler, initConf } = props;
  const [state, dispatch] = useReducer(
    (state: AIConfig, action: AIConfigAction) => {
      switch (action.type) {
        case "SET_MODEL_TYPE":
          return {
            ...state,
            modelType: action.payload,
          };
        case "SET_DIFY_CONFIG":
          return {
            ...state,
            difyConf: action.payload,
          };
        case "SET_FLOWISE_CONFIG":
          return {
            ...state,
            flowiseConf: action.payload,
          };
        case "SET_LANG_GRAPH_CONFIG":
          return {
            ...state,
            langGraphConf: action.payload,
          };
        case "SET_TEMPERATURE":
          return {
            ...state,
            temperature: action.payload,
          };
        case "SET_ATTACH_HISTORY_LIMIT":
          return {
            ...state,
            attachHistoryLimit: action.payload,
          };
        default:
          return state;
      }
    },
    initConf
  );

  let AdditionalConfigPart = <></>;
  switch (state.modelType) {
    case "dify":
      AdditionalConfigPart = (
        <>
          <div className="col-start-2 col-span-3">
            <TextField
              label="Server URL"
              value={state.difyConf?.serverUrl ?? ""}
              variant="outlined"
              fullWidth
              size="small"
              onChange={(event) => {
                dispatch({
                  type: "SET_DIFY_CONFIG",
                  payload: {
                    ...(state.difyConf ?? DEFAULT_DIFY_CONF),
                    serverUrl: event.target.value,
                  },
                });
              }}
              onBlur={(event) => {
                handler({
                  ...state,
                  difyConf: {
                    ...(state.difyConf ?? DEFAULT_DIFY_CONF),
                    serverUrl: event.target.value,
                  },
                });
              }}
            />
          </div>
          <div className="col-start-2 col-span-3">
            <TextField
              label="API Key"
              value={state.difyConf?.apiKey ?? ""}
              variant="outlined"
              fullWidth
              size="small"
              onChange={(event) => {
                dispatch({
                  type: "SET_DIFY_CONFIG",
                  payload: {
                    ...(state.difyConf ?? DEFAULT_DIFY_CONF),
                    apiKey: event.target.value,
                  },
                });
              }}
              onBlur={(event) => {
                handler({
                  ...state,
                  difyConf: {
                    ...(state.difyConf ?? DEFAULT_DIFY_CONF),
                    apiKey: event.target.value,
                  },
                });
              }}
            />
          </div>
        </>
      );
      break;
    case "flowise":
      AdditionalConfigPart = (
        <>
          <div className="col-start-2 col-span-3">
            <TextField
              label="Server URL with ChatFlowID"
              value={state.flowiseConf?.chatFlowID ?? ""}
              variant="outlined"
              fullWidth
              size="small"
              onChange={(event) => {
                dispatch({
                  type: "SET_FLOWISE_CONFIG",
                  payload: {
                    ...(state.flowiseConf ?? DEFAULT_FLOWISE_CONF),
                    chatFlowID: event.target.value,
                  },
                });
              }}
              onBlur={(event) => {
                handler({
                  ...state,
                  flowiseConf: {
                    ...(state.flowiseConf ?? DEFAULT_FLOWISE_CONF),
                    chatFlowID: event.target.value,
                  },
                });
              }}
            />
          </div>
          <div className="col-start-2 col-span-3">
            <TextField
              label="API Key"
              value={state.flowiseConf?.apiKey ?? ""}
              variant="outlined"
              fullWidth
              size="small"
              onChange={(event) => {
                dispatch({
                  type: "SET_FLOWISE_CONFIG",
                  payload: {
                    ...(state.flowiseConf ?? DEFAULT_FLOWISE_CONF),
                    apiKey: event.target.value,
                  },
                });
              }}
              onBlur={(event) => {
                handler({
                  ...state,
                  flowiseConf: {
                    ...(state.flowiseConf ?? DEFAULT_FLOWISE_CONF),
                    apiKey: event.target.value,
                  },
                });
              }}
            />
          </div>
        </>
      );
      break;
    case "langGraph":
      const graphs = [
        {
          value: "agenda_summarizer",
          label: "Agenda Summarizer",
          detail: "Summarize the agenda",
        },
        {
          value: "simple_researcher",
          label: "Simple Researcher",
          detail: "Research the topic",
        },
      ];

      // 課題
      // state.langGraphConf が定められていない場合、agenda_summarizer　を値として見せているので、それに安心してデータが入っていない
      if (state.langGraphConf === undefined) {
        dispatch({
          type: "SET_LANG_GRAPH_CONFIG",
          payload: DEFAULT_LANG_GRAPH_CONF,
        });
      }

      AdditionalConfigPart = (
        <>
          <div className="col-start-2 col-span-3">
            <Select
              labelId=""
              value={state.langGraphConf?.langGraphID}
              label={"LangGraph ID"}
              onChange={(event) => {
                const langGraphConf = {
                  ...(state.langGraphConf ?? DEFAULT_LANG_GRAPH_CONF),
                  langGraphID: event.target.value,
                };
                dispatch({
                  type: "SET_LANG_GRAPH_CONFIG",
                  payload: langGraphConf,
                });
                handler({
                  ...state,
                  langGraphConf,
                });
              }}
              size="small"
            >
              {graphs.map((option, index) => (
                <MenuItem value={option.value} key={index}>
                  <div className="flex flex-col">
                    <div>{option.label}</div>
                    <div className="text-xs">{option.detail}</div>
                  </div>
                </MenuItem>
              ))}
            </Select>
          </div>
        </>
      );
      break;
    default:
      AdditionalConfigPart = (
        <>
          <div className="col-span-1 mt-4">
            <Tooltip title="The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit.">
              <div>Temperature</div>
            </Tooltip>
          </div>
          <div className="col-span-3">
            <AITemperatureSelector
              temperature={state.temperature}
              onTemperatureChange={(event, value) => {
                dispatch({
                  type: "SET_TEMPERATURE",
                  payload: value as number,
                });
                handler({
                  ...state,
                  temperature: value as number,
                });
              }}
            />
          </div>
        </>
      );
      break;
  }

  return (
    <>
      <div className="col-span-1">
        <Tooltip title="LLM model to process">
          <div>Model</div>
        </Tooltip>
      </div>
      <div className="col-span-3">
        <FormControl fullWidth>
          <InputLabel id="llmModel">Model</InputLabel>
          <AIModelSelector
            label="Model"
            selectedModel={state.modelType}
            onSelectModel={(event) => {
              dispatch({
                type: "SET_MODEL_TYPE",
                payload: event.target.value as ModelType,
              });
              handler({
                ...state,
                modelType: event.target.value as ModelType,
              });
            }}
          />
        </FormControl>
      </div>
      {AdditionalConfigPart}
    </>
  );
};
