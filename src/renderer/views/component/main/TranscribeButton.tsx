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
import { RadioButtonChecked } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useTranscribeStore } from "../../store/useTranscribeStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";

export const TranscribeButton = () => {
  const recording = useVBStore((state) => state.recording);
  const transcriber = useTranscribeStore((state) => state);
  return (
    <Button
      variant="outlined"
      className="p-0 min-w-0 rounded-full h-10 w-10 border-0"
      onClick={
        recording ? transcriber.stopTranscribe : transcriber.startTranscribe
      }
    >
      {recording ? (
        <RadioButtonChecked className="text-red-600 text-3xl" />
      ) : (
        <RadioButtonChecked className="text-emerald-400 text-3xl" />
      )}
    </Button>
  );
};
