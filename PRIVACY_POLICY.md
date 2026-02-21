# Privacy Policy – Voice Bridge

**Last updated:** February 21, 2026

## Overview

Voice Bridge is a Zepp OS smartwatch application that captures voice input, converts it to text using the system speech-to-text engine, and sends the resulting text to a webhook endpoint configured by the user.

## Data Collection

Voice Bridge does **not** collect, store, or transmit any personal data to the developer or any third party. The app has no analytics, telemetry, tracking, or advertising.

## Data Processing

### Voice Input

Voice-to-text conversion is performed by the Zepp OS system keyboard. Voice Bridge does not process audio data directly — it only receives the resulting transcription from the operating system.

### HTTP Transmission

The transcribed text is sent as an HTTP POST request to an endpoint URL configured entirely by the user. This transmission occurs through the paired phone via BLE proxy. The developer has no access to the content of these requests or the endpoint they are sent to.

### Configuration Data

The following settings are stored locally on the user's paired phone via Zepp App and are never sent to the developer:

- **Endpoint URL** – the webhook address defined by the user
- **Authorization token** – optional authentication header value
- **JSON key** – the field name used in the request payload
- **Sender identifier** – optional label included in the payload

## Data Storage

Voice Bridge does not maintain any persistent storage on the watch. Configuration is stored in the Zepp App companion settings on the user's phone. No message history is kept.

## Third-Party Services

Voice Bridge relies on:

- **Zepp OS** – for speech-to-text processing and BLE communication
- **User-defined endpoint** – all transmitted data goes exclusively to the address configured by the user

The developer is not responsible for the data handling practices of the user-configured endpoint.

## Children's Privacy

Voice Bridge is not directed at children under 13 and does not knowingly collect data from children.

## Changes to This Policy

Updates to this policy will be reflected in this document with a revised date. Continued use of the app constitutes acceptance of the updated policy.

## Contact

For questions about this privacy policy, please open an issue at:
https://github.com/piotrlo/zepp-voice-bridge/issues
