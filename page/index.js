import { BasePage } from "@zeppos/zml/base-page"
import { createWidget, widget, prop, align, createKeyboard, inputType, deleteKeyboard } from "@zos/ui"
import { showToast } from "@zos/interaction"
import { log, px } from "@zos/utils"
import { vibrate } from "@zos/sensor"

const logger = log.getLogger("VoiceBridge")
const DESIGN_WIDTH = 336
const BUTTON_WIDTH = 240

Page(
  BasePage({
    state: {
      transcribedText: "",
      status: "idle",
      responseCode: "-"
    },
    build() {
      this.createUI()
      this.openVoiceInput()
    },
    /**
     * Creates all UI widgets for status, transcription and retry action.
     *
     * @returns {void}
     */
    createUI() {
      const fullWidth = px(DESIGN_WIDTH)
      const horizontalPadding = px(12)
      const contentWidth = fullWidth - horizontalPadding * 2
      const buttonWidth = px(BUTTON_WIDTH)

      this.statusWidget = createWidget(widget.TEXT, {
        x: horizontalPadding,
        y: px(40),
        w: contentWidth,
        h: px(40),
        text: "Listening...",
        text_size: px(20),
        color: 0x999999,
        align_h: align.CENTER_H
      })

      this.responseWidget = createWidget(widget.TEXT, {
        x: horizontalPadding,
        y: px(78),
        w: contentWidth,
        h: px(26),
        text: "HTTP: -",
        text_size: px(18),
        color: 0xaaaaaa,
        align_h: align.CENTER_H
      })

      this.resultWidget = createWidget(widget.TEXT, {
        x: horizontalPadding,
        y: px(110),
        w: contentWidth,
        h: px(250),
        text: "",
        text_size: px(28),
        color: 0xffffff,
        align_h: align.CENTER_H
      })

      this.retryButton = createWidget(widget.BUTTON, {
        x: Math.floor((fullWidth - buttonWidth) / 2),
        y: px(200),
        w: buttonWidth,
        h: px(70),
        text: "Repeat",
        text_size: px(24),
        color: 0xffffff,
        normal_color: 0x2d7dff,
        press_color: 0x1a5fd1,
        radius: px(35),
        click_func: () => this.openVoiceInput()
      })
    },
    /**
     * Opens voice keyboard input immediately on app start.
     *
     * @returns {void}
     */
    openVoiceInput() {
      this.updateStatus("Listening...")
      this.updateResponseCode("-")

      createKeyboard({
        inputType: inputType.VOICE,
        onComplete: (_, result) => {
          deleteKeyboard()
          if (result && result.data) {
            this.onTranscriptionReady(result.data)
            return
          }
          this.updateStatus("No input")
        },
        onCancel: () => {
          deleteKeyboard()
          this.updateStatus("Cancelled")
        }
      })
    },
    /**
     * Updates UI and triggers endpoint delivery once input is available.
     *
     * @param {string} text - Transcribed or typed input text.
     * @returns {void}
     */
    onTranscriptionReady(text) {
      this.state.transcribedText = text
      this.resultWidget.setProperty(prop.TEXT, text)
      this.updateStatus("Transcribed")
      this.sendToEndpoint(text)
    },
    /**
     * Updates current status label.
     *
     * @param {string} statusText - Status text displayed to the user.
     * @returns {void}
     */
    updateStatus(statusText) {
      this.state.status = statusText
      this.statusWidget.setProperty(prop.TEXT, statusText)
    },
    /**
     * Updates HTTP response code label shown on top of the screen.
     *
     * @param {string|number} code - HTTP status code or fallback marker.
     * @returns {void}
     */
    updateResponseCode(code) {
      this.state.responseCode = String(code)
      this.responseWidget.setProperty(prop.TEXT, `HTTP: ${this.state.responseCode}`)
    },
    /**
     * Fetches phone-side config and sends the captured text to configured endpoint.
     *
     * @param {string} text - Text payload captured on watch.
     * @returns {void}
     */
    sendToEndpoint(text) {
      this.updateStatus("Sending...")

      this.request({ method: "GET_CONFIG" })
        .then(({ result }) => {
          const config = JSON.parse(result)
          const payloadKey = config.payload_key || "message"
          const requestBody = {
            [payloadKey]: text
          }

          if (config.sender_id) {
            requestBody.sender = config.sender_id
          }

          const headers = { "Content-Type": "application/json" }

          if (config.auth_token) {
            headers.Authorization = config.auth_token
          }

          return this.httpRequest({
            url: config.endpoint_url,
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
            timeout: 10000
          })
        })
        .then((response) => {
          const statusCode = response && typeof response.status === "number" ? response.status : 200
          this.updateResponseCode(statusCode)
          this.updateStatus("Sent")
          showToast({ content: "Sent" })
          vibrate({ type: "short" })
        })
        .catch((error) => {
          logger.error("Send error", JSON.stringify(error))
          if (error && typeof error.status === "number") {
            this.updateResponseCode(error.status)
            this.updateStatus("Error")
            showToast({ content: "Error" })
            return
          }
          this.updateResponseCode("UNK")
          this.updateStatus("Sent")
          showToast({ content: "Sent" })
          vibrate({ type: "short" })
        })
    }
  })
)
