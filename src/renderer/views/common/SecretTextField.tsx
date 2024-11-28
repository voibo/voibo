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
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useState } from "react";

export const SecretTextField = (props: {
  initial: string;
  label: string;
  onBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}) => {
  const { initial, label, onBlur } = props;
  const [apiKey, setApiKey] = useState(initial);
  const [showApiKey, setShowApiKey] = useState(false); // APIキーを表示するかどうか

  const handleToggleShowApiKey = () => {
    setShowApiKey((prev) => !prev);
  };

  return (
    <TextField
      fullWidth
      label={label}
      value={apiKey}
      type={showApiKey ? "text" : "password"} // 表示・非表示の切り替え
      onChange={(e) => setApiKey(e.target.value)} // 入力のハンドリング
      onBlur={onBlur} // フォーカスが外れたときのハンドリング
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleToggleShowApiKey} edge="end">
              {showApiKey ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};
