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
import { SecretTextField } from "../common/SecretTextField.jsx";
import { useVAConfStore } from "../store/useVAConfStore.jsx";

export const LLMSetting = () => {
  const vaConfStore = useVAConfStore();
  return (
    <div className="w-full flex flex-col space-y-6">
      <SecretTextField
        initial={vaConfStore.conf!.OPENAI_API_KEY}
        label={"OpenAI API Key"}
        onBlur={(event) => {
          vaConfStore.updateVAConf({
            ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
            OPENAI_API_KEY: event.target.value,
          });
        }}
      />

      <SecretTextField
        initial={vaConfStore.conf!.ANTHROPIC_API_KEY}
        label={"Anthropic API Key"}
        onBlur={(event) => {
          vaConfStore.updateVAConf({
            ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
            ANTHROPIC_API_KEY: event.target.value,
          });
        }}
      />

      <SecretTextField
        initial={vaConfStore.conf!.GROQ_API_KEY}
        label={"Groq API Key"}
        onBlur={(event) => {
          vaConfStore.updateVAConf({
            ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
            GROQ_API_KEY: event.target.value,
          });
        }}
      />

      <SecretTextField
        initial={vaConfStore.conf!.GOOGLE_API_KEY}
        label={"Google API Key"}
        onBlur={(event) => {
          vaConfStore.updateVAConf({
            ...vaConfStore.conf!, // loadされたあとなので必ず存在するはず
            GOOGLE_API_KEY: event.target.value,
          });
        }}
      />
    </div>
  );
};
