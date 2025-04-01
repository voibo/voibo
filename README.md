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
