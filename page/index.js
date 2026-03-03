import { BasePage } from "@zeppos/zml/base-page"
import { createWidget, widget, prop, align, createKeyboard, inputType, deleteKeyboard } from "@zos/ui"
import { showToast } from "@zos/interaction"
import { log, px } from "@zos/utils"
import { vibrate } from "@zos/sensor"

const logger = log.getLogger("VoiceBridge")
const DESIGN_WIDTH = 336
const BUTTON_WIDTH = 240
const BUTTON_HEIGHT = 62
const REPEAT_SINGLE_Y = 248
const TRY_AGAIN_Y = 178
const HTTP_TIMEOUT_MS = 10000
const COLOR = {
  NEUTRAL: 0x999999,
  MUTED: 0x888888,
  WHITE: 0xffffff,
  SUCCESS: 0x4caf50,
  WARNING: 0xff8800,
  ERROR_4XX: 0xff4444,
  ERROR_5XX: 0xff6600
}

Page(
  BasePage({
    state: {
      transcribedText: "",
      status: "idle",
      responseCode: "-",
      config: null
    },
    build() {
      this.createUI()
      this.loadConfig()
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
        text: "Loading...",
        text_size: px(20),
        color: COLOR.NEUTRAL,
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

      this.tryAgainButton = createWidget(widget.BUTTON, {
        x: Math.floor((fullWidth - buttonWidth) / 2),
        y: px(TRY_AGAIN_Y),
        w: buttonWidth,
        h: px(BUTTON_HEIGHT),
        text: "Try again",
        text_size: px(24),
        color: 0xffffff,
        normal_color: 0xd14545,
        press_color: 0xb43434,
        radius: px(35),
        click_func: () => {
          if (!this.state.transcribedText) {
            this.openVoiceInput()
            return
          }
          this.sendToEndpoint(this.state.transcribedText)
        }
      })

      this.repeatButton = createWidget(widget.BUTTON, {
        x: Math.floor((fullWidth - buttonWidth) / 2),
        y: px(REPEAT_SINGLE_Y),
        w: buttonWidth,
        h: px(BUTTON_HEIGHT),
        text: "Repeat",
        text_size: px(24),
        color: 0xffffff,
        normal_color: 0x2d7dff,
        press_color: 0x1a5fd1,
        radius: px(35),
        click_func: () => {
          if (this.state.config && this.state.config.endpoint_url) {
            this.openVoiceInput()
            return
          }
          this.loadConfig()
        }
      })

      this.updateButtons(false, false)
    },
    /**
     * Loads configuration from the phone and validates endpoint presence.
     *
     * @returns {void}
     */
    loadConfig() {
      this.updateButtons(false, false)
      this.updateStatus("Loading settings...", COLOR.NEUTRAL)
      this.updateResponseCode("-")
      this.resultWidget.setProperty(prop.TEXT, "")

      this.request({ method: "GET_CONFIG" })
        .then(({ result }) => {
          const config = JSON.parse(result)
          this.state.config = config
          if (!config || !config.endpoint_url || !config.endpoint_url.trim()) {
            this.showNoEndpointScreen()
            return
          }
          this.openVoiceInput()
        })
        .catch((error) => {
          logger.error("Config load error", JSON.stringify(error))
          this.showNoConnectionScreen()
        })
    },
    /**
     * Renders no-connection state when app cannot reach phone companion config.
     *
     * @returns {void}
     */
    showNoConnectionScreen() {
      this.state.config = null
      this.updateStatus("No connection", COLOR.WARNING)
      this.updateResponseCode("-")
      this.resultWidget.setProperty(prop.TEXT, "Open Zepp App and keep it active,\nthen tap Update settings.")
      this.updateButtons(true, false, "Update settings")
    },
    /**
     * Renders setup-required state when endpoint is missing.
     *
     * @returns {void}
     */
    showNoEndpointScreen() {
      this.updateStatus("Setup Required", COLOR.WARNING)
      this.updateResponseCode("-")
      this.resultWidget.setProperty(prop.TEXT, "Open Zepp App\nSettings -> Voice Bridge")
      this.updateButtons(true, false, "Check Again")
    },
    /**
     * Updates visibility and layout for action buttons.
     *
     * @param {boolean} showRepeat - Whether Repeat button should be visible.
     * @param {boolean} showTryAgain - Whether Try again button should be visible.
     * @param {string} repeatText - Label for Repeat button.
     * @returns {void}
     */
    updateButtons(showRepeat, showTryAgain, repeatText = "Repeat") {
      this.repeatButton.setProperty(prop.VISIBLE, showRepeat ? 1 : 0)
      this.tryAgainButton.setProperty(prop.VISIBLE, showTryAgain ? 1 : 0)
      this.repeatButton.setProperty(prop.TEXT, repeatText)
      this.repeatButton.setProperty(prop.MORE, { y: px(REPEAT_SINGLE_Y) })
    },
    /**
     * Opens voice keyboard input.
     *
     * @returns {void}
     */
    openVoiceInput() {
      if (!this.state.config || !this.state.config.endpoint_url || !this.state.config.endpoint_url.trim()) {
        this.showNoEndpointScreen()
        return
      }

      this.updateButtons(false, false)
      this.updateStatus("Listening...", COLOR.NEUTRAL)
      this.resultWidget.setProperty(prop.TEXT, "")
      this.state.transcribedText = ""
      this.updateResponseCode("-")

      createKeyboard({
        inputType: inputType.VOICE,
        onComplete: (_, result) => {
          deleteKeyboard()
          if (result && result.data) {
            this.onTranscriptionReady(result.data)
            return
          }
          this.updateStatus("No input", COLOR.MUTED)
          this.updateButtons(true, false)
        },
        onCancel: () => {
          deleteKeyboard()
          this.updateStatus("Cancelled", COLOR.MUTED)
          this.updateButtons(true, false)
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
      this.updateStatus("Transcribed", COLOR.WHITE)
      this.updateButtons(false, false)
      this.sendToEndpoint(text)
    },
    /**
     * Updates current status label.
     *
     * @param {string} statusText - Status text displayed to the user.
     * @param {number} color - Status label color.
     * @returns {void}
     */
    updateStatus(statusText, color = COLOR.NEUTRAL) {
      this.state.status = statusText
      this.statusWidget.setProperty(prop.TEXT, statusText)
      this.statusWidget.setProperty(prop.COLOR, color)
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
     * Extracts a displayable string from the HTTP response body.
     * Handles string, object and missing body gracefully.
     *
     * @param {object} response - Raw httpRequest response.
     * @param {number} maxLength - Maximum characters to display.
     * @returns {string} Parsed body text or empty string.
     */
    parseResponseBody(response, maxLength = 200) {
      if (!response || !response.body) return ""
      const raw = typeof response.body === "string" ? response.body : JSON.stringify(response.body)
      return raw.length > maxLength ? raw.slice(0, maxLength) + "..." : raw
    },
    /**
     * Extracts displayable body text from an error object when available.
     *
     * @param {unknown} error - Rejection payload from httpRequest.
     * @param {number} maxLength - Maximum characters to display.
     * @returns {string} Parsed error body text or empty string.
     */
    parseErrorBody(error, maxLength = 200) {
      if (!error || typeof error !== "object") {
        return ""
      }

      const payload = error
      const candidate = payload.body || payload.response || payload.result || payload.data
      if (!candidate) {
        return ""
      }

      const raw = typeof candidate === "string" ? candidate : JSON.stringify(candidate)
      return raw.length > maxLength ? raw.slice(0, maxLength) + "..." : raw
    },
    /**
     * Detects success markers in non-standard endpoint responses.
     *
     * @param {string} bodyText - Response payload as text.
     * @returns {boolean} True when payload suggests successful processing.
     */
    isSuccessLikePayload(bodyText) {
      if (!bodyText) {
        return false
      }

      const normalized = bodyText.toLowerCase()
      const hasOkTrue = normalized.includes('"ok":true') || normalized.includes('"ok":"true"')
      const hasRunId = normalized.includes("runid")
      return hasOkTrue || hasRunId
    },
    /**
     * Builds payload sent to external endpoint from current settings and text.
     *
     * @param {string} text - User text from transcription.
     * @param {{payload_key?: string, sender_id?: string, include_timestamp?: boolean}} config - Cached settings config.
     * @returns {Record<string, string|number|boolean>}
     */
    buildPayload(text, config) {
      const payloadKey = config.payload_key || "message"
      const requestBody = {
        [payloadKey]: text
      }

      if (config.sender_id) {
        requestBody.sender = config.sender_id
      }

      if (config.include_timestamp) {
        requestBody.timestamp = Math.floor(Date.now() / 1000)
      }

      return requestBody
    },
    /**
     * Builds request headers from configuration.
     *
     * @param {{auth_token?: string}} config - Cached settings config.
     * @returns {Record<string, string>}
     */
    buildHeaders(config) {
      const headers = { "Content-Type": "application/json" }
      if (config.auth_token) {
        headers.Authorization = config.auth_token
      }
      return headers
    },
    /**
     * Handles explicit HTTP status code errors.
     *
     * @param {number} statusCode - HTTP response code.
     * @returns {void}
     */
    handleHttpErrorStatus(statusCode) {
      const is4xx = statusCode >= 400 && statusCode < 500
      const color = is4xx ? COLOR.ERROR_4XX : COLOR.ERROR_5XX
      this.updateResponseCode(statusCode)
      this.updateStatus(`Error ${statusCode}`, color)
      showToast({ content: "Error" })
      this.updateButtons(true, true)
    },
    /**
     * Sends captured text to the configured endpoint.
     *
     * @param {string} text - Text payload captured on watch.
     * @returns {void}
     */
    sendToEndpoint(text) {
      if (!this.state.config || !this.state.config.endpoint_url || !this.state.config.endpoint_url.trim()) {
        this.showNoEndpointScreen()
        return
      }

      const config = this.state.config
      const requestBody = this.buildPayload(text, config)
      const headers = this.buildHeaders(config)

      this.updateStatus("Sending...", COLOR.NEUTRAL)
      this.updateButtons(false, false)

      this.httpRequest({
        url: config.endpoint_url,
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        timeout: HTTP_TIMEOUT_MS
      })
        .then((response) => {
          const statusCode = response && typeof response.status === "number" ? response.status : 200
          if (statusCode >= 400) {
            this.handleHttpErrorStatus(statusCode)
            return
          }

          this.updateResponseCode(statusCode)
          const body = this.parseResponseBody(response)
          if (body) {
            this.resultWidget.setProperty(prop.TEXT, body)
          }
          this.updateStatus("Sent", COLOR.SUCCESS)
          showToast({ content: "Sent" })
          vibrate({ type: "short" })
          this.updateButtons(true, false)
        })
        .catch((error) => {
          logger.error("Send error", JSON.stringify(error))
          if (error && typeof error.status === "number") {
            this.handleHttpErrorStatus(error.status)
            return
          }
          const errorBody = this.parseErrorBody(error)
          if (this.isSuccessLikePayload(errorBody)) {
            this.updateResponseCode("UNK")
            if (errorBody) {
              this.resultWidget.setProperty(prop.TEXT, errorBody)
            }
            this.updateStatus("Sent", COLOR.SUCCESS)
            showToast({ content: "Sent" })
            vibrate({ type: "short" })
            this.updateButtons(true, false)
            return
          }
          this.updateResponseCode("NET")
          this.updateStatus("No connection", COLOR.WARNING)
          showToast({ content: "Error" })
          this.updateButtons(true, true)
        })
    }
  })
)
