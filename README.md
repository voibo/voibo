# Voibo

**Voibo** is a collaborative meeting intelligence platform. It's an open-source platform designed to enhance meeting efficiency and intellectual productivity through real-time meeting audio analysis, visual information organization, and seamless integration with AI assistants.

- **Real-Time Audio Analysis**: Analyzes meeting audio in real time to extract and visualize key topics.
- **Node-Based Visualization**: Extracted topics, as well as information created by users or AI assistants, are organized in a **node and edge format**, providing an intuitive interface to understand relationships.
- **Utilization of AI Assistants**: Based on extracted topics, AI assistants automatically perform actions such as summarization, idea generation, information retrieval, and cross-checking with internal data.
- **Agenda Support:** By registering an agenda and recording the meeting progress, the AI assistant can be utilized at each stage of the agenda.
- **User-Centric Interaction**: Users can select any node to call an AI assistant, promoting seamless collaboration with AI.
- **Extensibility**: Supports a wide range of assistants, from simple prompt-based AI to integrations with external services.

https://github.com/user-attachments/assets/0f69abb4-596c-4356-8248-c4f72de81d3a

## Basic Usage

1. Add a new VoiceBoard.
1. Register the meeting agenda.
1. Add an AI assistant.
1. Start recording in line with the meeting.
1. Specify agenda items sequentially as the meeting progresses.
1. Nodes summarizing topics from the conversation are automatically generated in real time.
1. With each new topic or agenda progression, the AI assistant activates and generates assistant nodes.
1. Additionally, users can create nodes from their own input text and leverage the AI assistant alongside existing nodes.
1. Stop recording at the end of the meeting.

## Binary Installation

Download and install the binary data for macOS(Apple silicon).

## Building from Source

For macOS environments, build following the steps below.

### Preparation

Ensure you have the latest versions of Xcode and Homebrew installed, then install the following dependencies:

```bash
$ brew install cmake ninja
```

### Build

Set up the development environment by executing the following commands in the terminal:

```bash
$ git clone https://github.com/voibo/voibo.git
$ cd voibo
$ npm install
$ npm start
```

## Initial Setup

Click on the gear icon in the upper right corner of the main screen to configure at least the following settings.

### Audio Devices

<img src="https://github.com/user-attachments/assets/c55cf08f-8e09-488a-a7bf-738bcfe89a62" width="400" />

Set up the device that will input the user's voice to the microphone.
Voibo has its own audio and screen capture functionality, so you can process audio played from other applications like Google Chrome without needing to set up virtual device applications.

### Transcriber

<img src="https://github.com/user-attachments/assets/9292aed4-8795-4578-b272-8901a0645850" width="400" />

You'll need to configure at least one of the following options.

#### Google Speech-to-Text

This Transcriber uses [Google Speech to Text](https://cloud.google.com/speech-to-text) for streaming speech recognition.

❗Google will charge API usage fees based on the amount of transcription used.

1. Prepare a service account that can use the Speech to Text API in Google Cloud Console, and save the service account key locally in JSON format. For detailed instructions, please check Google's documentation.
1. Enter the absolute path of the saved JSON key file in the Credential JSON Path field.

#### mlx whisper large v3 turbo

This is a Transcriber that leverages [voibo/mlx_whisper_stream](https://github.com/voibo/mlx_whisper_stream), a Python-based tool designed specifically for streaming speech recognition on macOS with Apple Silicon. No additional payment for transcribe is required!

1. Set up [voibo/mlx_whisper_stream](https://github.com/voibo/mlx_whisper_stream) according to the README.md in the repository.
2. Enter the absolute path of the mlx_whisper_stream repository root directory (e.g., /Users/your_account/Document/GitHub/mlx_whisper_stream) in the Whisper Exec Path field.

### Keys

<img src="https://github.com/user-attachments/assets/7ffdd05f-ace7-4d19-901c-5f61a56ee421" width="400" />

Set up LLM API keys used for Topic generation and various Assistants.

❗According to your contract with each LLM Provider, you will be charged usage fees from the respective companies based on your API usage.

Currently, an OpenAI API Key is required. For specific instructions on how to obtain it, please check OpenAI's documentation.

## Contribution

For those who'd like to contribute code, see our CONTRIBUTING.md.
At the same time, please consider supporting Voibo by sharing it on social media and at events and conferences.

## Community

[Discord](https://discord.gg/d9HRhQtDFw)

## Vision

Voibo aims to be a next-generation meeting platform that integrates knowledge and creates new value through interaction between humans and AI. Beyond a simple meeting efficiency tool, its goal is to transform individual thoughts and insights into organizational knowledge.

- **Revolutionizing Intellectual Productivity**: Enables efficient and creative decision-making through collaboration between humans and AI.
- **Seamless Collaboration Experience**: Enhances participant engagement during meetings with the help of AI assistants.
- **Sustainable Knowledge Management**: Utilizes visualized meeting content and generated insights to build a knowledge base that supports future decision-making.

## License

Voibo is released under the [Apache License 2.0](LICENSE).
