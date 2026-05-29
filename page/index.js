import { BasePage } from "@zeppos/zml/base-page"
import { createWidget, widget, prop, align, createKeyboard, inputType, deleteKeyboard } from "@zos/ui"
import { showToast } from "@zos/interaction"
import { log, px } from "@zos/utils"
import { vibrate, Vibrator, VIBRATOR_SCENE_TIMER } from "@zos/sensor"

const logger = log.getLogger("VoiceBridge")
const DESIGN_WIDTH = 336
const BUTTON_WIDTH = 240
const BUTTON_HEIGHT = 62
const REPEAT_SINGLE_Y = 248
const TRY_AGAIN_Y = 178
const HTTP_TIMEOUT_MS = 10000
const ACTION_COOLDOWN_MS = 400
const ARC_SIZE = 60
const ARC_CENTER_X = 168
const ARC_CENTER_Y = 95
const ARC_SPIN_INTERVAL_MS = 50
const ARC_ANGLE_STEP = 10
const ARC_ARC_SPAN = 270
const ARC_FINISH_SPIN_MS = 800
const ARC_LINE_WIDTH = 6
const STATUS_Y = 40
const RESPONSE_CODE_Y = 70
const RESULT_TEXT_Y = 110
const RESPONSE_TOGGLE_Y = 170
const REPEAT_SUCCESS_HIDDEN_Y = 210
const REPEAT_SUCCESS_SHOWN_Y = 280
const RESPONSE_LINE_WIDTH = 20
const COLOR = {
  NEUTRAL: 0x999999,
  MUTED: 0x888888,
  WHITE: 0xffffff,
  SENDING: 0x2d7dff,
  SUCCESS: 0x4caf50,
  WARNING: 0xff8800,
  ERROR_4XX: 0xff4444,
  ERROR_5XX: 0xff6600
}

/** @type {Vibrator | null} */
let vibratorMotor = null

/**
 * Returns a shared vibrator instance using the exported sensor or Vibrator fallback.
 *
 * @returns {Vibrator}
 */
function getVibratorMotor() {
  if (!vibratorMotor) {
    vibratorMotor = typeof vibrate?.start === "function" ? vibrate : new Vibrator()
  }
  return vibratorMotor
}

/**
 * Runs a single vibration pulse for the given duration in milliseconds.
 *
 * @param {number} durationMs - Pulse length in milliseconds.
 * @returns {void}
 */
function runVibrationPulse(durationMs) {
  const motor = getVibratorMotor()
  if (typeof motor.stop === "function") {
    motor.stop()
  }
  if (typeof motor.start === "function") {
    motor.start()
    setTimeout(() => {
      if (typeof motor.stop === "function") {
        motor.stop()
      }
    }, durationMs)
    return
  }
  vibrate({ type: "short" })
}

/**
 * Short pulse before sending a request to the endpoint.
 *
 * @returns {void}
 */
function vibrateSendStart() {
  runVibrationPulse(100)
}

/**
 * Double vibration pattern indicating successful delivery.
 *
 * @returns {void}
 */
function vibrateSuccess() {
  const motor = getVibratorMotor()
  if (typeof motor.start === "function") {
    runVibrationPulse(200)
    setTimeout(() => runVibrationPulse(200), 300)
    return
  }
  vibrate({ type: "short" })
}

/**
 * Long vibration pattern indicating an error.
 *
 * @returns {void}
 */
function vibrateError() {
  const motor = getVibratorMotor()
  if (typeof motor.start === "function") {
    if (typeof motor.stop === "function") {
      motor.stop()
    }
    motor.start({ mode: VIBRATOR_SCENE_TIMER })
    setTimeout(() => {
      if (typeof motor.stop === "function") {
        motor.stop()
      }
    }, 500)
    return
  }
  if (typeof vibrate === "function") {
    vibrate({ type: "short" })
    return
  }
  runVibrationPulse(500)
}

/**
 * Formats a raw HTTP response body for multi-line display on the watch TEXT widget.
 *
 * @param {string} raw - Raw response body text.
 * @returns {string} Pretty-printed text with line breaks.
 */
function formatResponseBodyDisplay(raw) {
  if (!raw) {
    return ""
  }
  let formatted = raw
  try {
    const parsed = JSON.parse(raw)
    formatted = JSON.stringify(parsed, null, 2)
  } catch {
    formatted = raw
  }
  const lines = formatted.split("\n")
  return lines
    .map((line) => {
      if (line.length <= RESPONSE_LINE_WIDTH) {
        return line
      }
      const chunks = []
      for (let i = 0; i < line.length; i += RESPONSE_LINE_WIDTH) {
        chunks.push(line.slice(i, i + RESPONSE_LINE_WIDTH))
      }
      return chunks.join("\n")
    })
    .join("\n")
}

Page(
  BasePage({
    state: {
      transcribedText: "",
      status: "idle",
      responseCode: "-",
      config: null,
      showResponse: false,
      lastResponseBody: ""
    },
    actionInProgress: false,
    lastActionEndedAt: 0,
    arcStartAngle: 0,
    arcSpinTimer: null,
    arcHideTimer: null,
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
        y: px(STATUS_Y),
        w: contentWidth,
        h: px(36),
        text: "Loading...",
        text_size: px(20),
        color: COLOR.NEUTRAL,
        align_h: align.CENTER_H
      })

      this.responseWidget = createWidget(widget.TEXT, {
        x: horizontalPadding,
        y: px(RESPONSE_CODE_Y),
        w: contentWidth,
        h: px(22),
        text: "HTTP: -",
        text_size: px(16),
        color: COLOR.MUTED,
        align_h: align.CENTER_H
      })

      this.resultWidget = createWidget(widget.TEXT, {
        x: horizontalPadding,
        y: px(RESULT_TEXT_Y),
        w: contentWidth,
        h: px(250),
        text: "",
        text_size: px(18),
        color: COLOR.WHITE,
        align_h: align.CENTER_H
      })

      this.responseToggleButton = createWidget(widget.BUTTON, {
        x: Math.floor((fullWidth - buttonWidth) / 2),
        y: px(RESPONSE_TOGGLE_Y),
        w: buttonWidth,
        h: px(44),
        text: "Show response",
        text_size: px(18),
        color: COLOR.WHITE,
        normal_color: 0x444444,
        press_color: 0x333333,
        radius: px(22),
        click_func: () => {
          this.toggleResponseVisibility()
        }
      })
      this.responseToggleButton.setProperty(prop.VISIBLE, 0)

      this.hideResponseButton = createWidget(widget.BUTTON, {
        x: Math.floor((fullWidth - buttonWidth / 2) / 2),
        y: px(290),
        w: Math.floor(buttonWidth / 2),
        h: px(44),
        text: "↩ Hide",
        text_size: px(16),
        color: COLOR.WHITE,
        normal_color: 0x444444,
        press_color: 0x333333,
        radius: px(22),
        click_func: () => {
          this.hideFullScreenResponse()
        }
      })
      this.hideResponseButton.setProperty(prop.VISIBLE, 0)

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
          if (!this.canStartAction()) {
            return
          }
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
          if (!this.canStartAction()) {
            return
          }
          if (this.state.config && this.state.config.endpoint_url) {
            this.openVoiceInput()
            return
          }
          this.loadConfig()
        }
      })

      const arcOffset = px(ARC_SIZE / 2)
      this.progressArc = createWidget(widget.ARC, {
        x: px(ARC_CENTER_X) - arcOffset,
        y: px(ARC_CENTER_Y) - arcOffset,
        w: px(ARC_SIZE),
        h: px(ARC_SIZE),
        radius: arcOffset,
        start_angle: 0,
        end_angle: ARC_ARC_SPAN,
        line_width: px(ARC_LINE_WIDTH),
        color: COLOR.SENDING
      })
      this.progressArc.setProperty(prop.VISIBLE, 0)

      this.updateButtons(false, false)
    },
    /**
     * Loads configuration from the phone and validates endpoint presence.
     *
     * @returns {void}
     */
    loadConfig() {
      this.beginAction()
      this.updateButtons(false, false)
      this.updateStatus("Connecting to Phone...", COLOR.NEUTRAL)
      this.updateResponseCode("-")
      this.resultWidget.setProperty(prop.TEXT, "")

      this.request({ method: "GET_CONFIG" })
        .then(({ result }) => {
          let config
          try {
            config = JSON.parse(result)
          } catch (parseError) {
            logger.error("Config parse error", JSON.stringify(parseError))
            this.showNoConnectionScreen()
            this.endAction()
            return
          }
          this.state.config = config
          if (!config || !config.endpoint_url || !config.endpoint_url.trim()) {
            this.showNoEndpointScreen()
            this.endAction()
            return
          }
          this.endAction()
          this.openVoiceInput()
        })
        .catch((error) => {
          logger.error("Config load error", JSON.stringify(error))
          this.showNoConnectionScreen()
          this.endAction()
        })
    },
    /**
     * Renders no-connection state when app cannot reach phone companion config.
     *
     * @returns {void}
     */
    showNoConnectionScreen() {
      this.state.config = null
      this.resetResponseToggle()
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
      this.resetResponseToggle()
      this.updateStatus("Setup Required", COLOR.WARNING)
      this.updateResponseCode("-")
      this.resultWidget.setProperty(
        prop.TEXT,
        "1) Open Zepp App\n2) Devices > Your watch > Apps > Voice Bridge\n3) Enter Endpoint URL (HTTPS)\n4) Tap Check Again"
      )
      this.updateButtons(true, false, "Check Again")
    },
    /**
     * Returns false when a user action should be ignored (debounce / in-flight guard).
     *
     * @returns {boolean}
     */
    canStartAction() {
      const now = Date.now()
      if (this.actionInProgress || now - this.lastActionEndedAt < ACTION_COOLDOWN_MS) {
        return false
      }
      return true
    },
    /**
     * Marks the start of a debounced user or network action.
     *
     * @returns {void}
     */
    beginAction() {
      this.actionInProgress = true
    },
    /**
     * Releases debounce guard after an action completes.
     *
     * @returns {void}
     */
    endAction() {
      this.actionInProgress = false
      this.lastActionEndedAt = Date.now()
    },
    /**
     * Updates visibility and layout for action buttons.
     *
     * @param {boolean} showRepeat - Whether Repeat button should be visible.
     * @param {boolean} showTryAgain - Whether Try again button should be visible.
     * @param {string} repeatText - Label for Repeat button.
     * @returns {void}
     */
    updateButtons(showRepeat, showTryAgain, repeatText = "Repeat", repeatY = REPEAT_SINGLE_Y) {
      this.repeatButton.setProperty(prop.VISIBLE, showRepeat ? 1 : 0)
      this.tryAgainButton.setProperty(prop.VISIBLE, showTryAgain ? 1 : 0)
      this.repeatButton.setProperty(prop.TEXT, repeatText)
      this.repeatButton.setProperty(prop.MORE, { y: px(repeatY) })
    },
    /**
     * Sets ARC start and end angles using direct property names for runtime updates.
     *
     * @param {number} startAngle - Arc start angle in degrees.
     * @returns {void}
     */
    setArcAngles(startAngle) {
      this.progressArc.setProperty("start_angle", startAngle)
      this.progressArc.setProperty("end_angle", startAngle + ARC_ARC_SPAN)
    },
    /**
     * Hides response toggle and clears stored response body state.
     *
     * @returns {void}
     */
    resetResponseToggle() {
      if (this.state.showResponse) {
        this.hideFullScreenResponse()
      }
      this.state.showResponse = false
      this.state.lastResponseBody = ""
      if (this.responseToggleButton) {
        this.responseToggleButton.setProperty(prop.VISIBLE, 0)
        this.responseToggleButton.setProperty(prop.TEXT, "Show response")
      }
      if (this.hideResponseButton) {
        this.hideResponseButton.setProperty(prop.VISIBLE, 0)
      }
    },
    /**
     * Stores full response body and shows the post-send success layout.
     *
     * @param {object} response - Raw httpRequest response.
     * @returns {void}
     */
    showSendSuccessScreen(response) {
      this.state.showResponse = false
      this.state.lastResponseBody = this.getFullResponseBody(response)
      this.resultWidget.setProperty(prop.TEXT, "")
      this.resultWidget.setProperty(prop.VISIBLE, 0)
      if (this.state.lastResponseBody) {
        this.responseToggleButton.setProperty(prop.VISIBLE, 1)
        this.responseToggleButton.setProperty(prop.TEXT, "Show response")
      } else {
        this.responseToggleButton.setProperty(prop.VISIBLE, 0)
      }
      this.updateSuccessLayout()
      this.updateButtons(true, false, "Repeat", REPEAT_SUCCESS_HIDDEN_Y)
    },
    /**
     * Repositions widgets for the success screen based on response visibility.
     *
     * @returns {void}
     */
    updateSuccessLayout() {
      this.repeatButton.setProperty(prop.MORE, { y: px(REPEAT_SUCCESS_HIDDEN_Y) })
      this.resultWidget.setProperty(prop.VISIBLE, 0)
      if (this.state.lastResponseBody) {
        this.responseToggleButton.setProperty(prop.TEXT, "Show response")
      }
    },
    /**
     * Opens full-screen formatted response body view with a back button.
     *
     * @returns {void}
     */
    showFullScreenResponse() {
      if (!this.state.lastResponseBody) {
        return
      }
      this.state.showResponse = true

      this.statusWidget.setProperty(prop.VISIBLE, 0)
      this.responseWidget.setProperty(prop.VISIBLE, 0)
      this.progressArc.setProperty(prop.VISIBLE, 0)
      this.repeatButton.setProperty(prop.VISIBLE, 0)
      this.tryAgainButton.setProperty(prop.VISIBLE, 0)
      this.responseToggleButton.setProperty(prop.VISIBLE, 0)

      const displayText = formatResponseBodyDisplay(this.state.lastResponseBody)
      this.resultWidget.setProperty(prop.TEXT, displayText)
      this.resultWidget.setProperty(prop.MORE, { y: px(40), h: px(250) })
      this.resultWidget.setProperty(prop.VISIBLE, 1)

      this.hideResponseButton.setProperty(prop.VISIBLE, 1)
    },
    /**
     * Restores the success screen layout after full-screen response view.
     *
     * @returns {void}
     */
    hideFullScreenResponse() {
      this.state.showResponse = false

      this.statusWidget.setProperty(prop.VISIBLE, 1)
      this.responseWidget.setProperty(prop.VISIBLE, 1)
      this.resultWidget.setProperty(prop.TEXT, "")
      this.resultWidget.setProperty(prop.MORE, { y: px(RESULT_TEXT_Y), h: px(250) })
      this.resultWidget.setProperty(prop.VISIBLE, 0)

      if (this.state.lastResponseBody) {
        this.responseToggleButton.setProperty(prop.VISIBLE, 1)
        this.responseToggleButton.setProperty(prop.TEXT, "Show response")
      }
      this.repeatButton.setProperty(prop.MORE, { y: px(REPEAT_SUCCESS_HIDDEN_Y) })
      this.repeatButton.setProperty(prop.VISIBLE, 1)

      this.hideResponseButton.setProperty(prop.VISIBLE, 0)
    },
    /**
     * Opens full-screen response view when the user taps Show response.
     *
     * @returns {void}
     */
    toggleResponseVisibility() {
      if (!this.state.lastResponseBody) {
        return
      }
      this.showFullScreenResponse()
    },
    /**
     * Returns the full HTTP response body as a string without truncation.
     *
     * @param {object} response - Raw httpRequest response.
     * @returns {string} Full body text or empty string.
     */
    getFullResponseBody(response) {
      if (!response || !response.body) {
        return ""
      }
      return typeof response.body === "string" ? response.body : JSON.stringify(response.body)
    },
    /**
     * Opens voice keyboard input.
     *
     * @returns {void}
     */
    openVoiceInput() {
      this.openKeyboardInput(inputType.VOICE)
    },
    /**
     * Opens text keyboard input (CHAR fallback per SPECIFICATION.md).
     *
     * @returns {void}
     */
    openTextInput() {
      this.openKeyboardInput(inputType.CHAR, true)
    },
    /**
     * Opens keyboard with the given input type; voice with no result falls back to CHAR.
     *
     * @param {number} keyboardType - Zepp OS input type (VOICE or CHAR).
     * @param {boolean} isTextFallback - True when opening CHAR after empty voice result.
     * @returns {void}
     */
    openKeyboardInput(keyboardType, isTextFallback = false) {
      if (!this.canStartAction()) {
        return
      }
      if (!this.state.config || !this.state.config.endpoint_url || !this.state.config.endpoint_url.trim()) {
        this.showNoEndpointScreen()
        return
      }

      this.beginAction()
      this.hideProgressArc()
      this.resetResponseToggle()
      this.updateButtons(false, false)
      const statusText =
        keyboardType === inputType.VOICE
          ? "Listening..."
          : isTextFallback
            ? "Type message..."
            : "Typing..."
      this.updateStatus(statusText, COLOR.NEUTRAL)
      this.resultWidget.setProperty(prop.TEXT, "")
      this.state.transcribedText = ""
      this.updateResponseCode("-")

      createKeyboard({
        inputType: keyboardType,
        onComplete: (_, result) => {
          deleteKeyboard()
          if (result && result.data) {
            this.endAction()
            this.onTranscriptionReady(result.data)
            return
          }
          if (keyboardType === inputType.VOICE) {
            this.endAction()
            this.openTextInput()
            return
          }
          this.updateStatus("No input", COLOR.MUTED)
          this.updateButtons(true, false)
          this.endAction()
        },
        onCancel: () => {
          deleteKeyboard()
          this.updateStatus("Cancelled", COLOR.MUTED)
          this.updateButtons(true, false)
          this.endAction()
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
     * Clears ARC animation timers and hides the progress indicator.
     *
     * @returns {void}
     */
    hideProgressArc() {
      if (this.arcSpinTimer !== null) {
        clearTimeout(this.arcSpinTimer)
        this.arcSpinTimer = null
      }
      if (this.arcHideTimer !== null) {
        clearTimeout(this.arcHideTimer)
        this.arcHideTimer = null
      }
      if (this.progressArc) {
        this.progressArc.setProperty(prop.VISIBLE, 0)
      }
    },
    /**
     * Starts the spinning ARC indicator for the sending state.
     *
     * @returns {void}
     */
    showProgressArcSending() {
      this.hideProgressArc()
      this.arcStartAngle = 0
      this.progressArc.setProperty(prop.COLOR, COLOR.SENDING)
      this.setArcAngles(this.arcStartAngle)
      this.progressArc.setProperty(prop.VISIBLE, 1)

      const spinFrame = () => {
        if (this.arcSpinTimer === null) {
          return
        }
        this.arcStartAngle = (this.arcStartAngle + ARC_ANGLE_STEP) % 360
        this.setArcAngles(this.arcStartAngle)
        this.arcSpinTimer = setTimeout(spinFrame, ARC_SPIN_INTERVAL_MS)
      }
      this.arcSpinTimer = setTimeout(spinFrame, ARC_SPIN_INTERVAL_MS)
    },
    /**
     * Keeps ARC spinning with a final success or error color, then hides after a short delay.
     *
     * @param {number} color - Final ARC color (success or error).
     * @returns {void}
     */
    finishProgressArc(color) {
      if (this.arcHideTimer !== null) {
        clearTimeout(this.arcHideTimer)
        this.arcHideTimer = null
      }
      this.progressArc.setProperty(prop.COLOR, color)
      this.progressArc.setProperty(prop.VISIBLE, 1)

      if (this.arcSpinTimer === null) {
        const spinFrame = () => {
          if (this.arcSpinTimer === null) {
            return
          }
          this.arcStartAngle = (this.arcStartAngle + ARC_ANGLE_STEP) % 360
          this.setArcAngles(this.arcStartAngle)
          this.arcSpinTimer = setTimeout(spinFrame, ARC_SPIN_INTERVAL_MS)
        }
        this.arcSpinTimer = setTimeout(spinFrame, ARC_SPIN_INTERVAL_MS)
      }

      this.arcHideTimer = setTimeout(() => {
        if (this.arcSpinTimer !== null) {
          clearTimeout(this.arcSpinTimer)
          this.arcSpinTimer = null
        }
        this.progressArc.setProperty(prop.VISIBLE, 0)
        this.arcHideTimer = null
      }, ARC_FINISH_SPIN_MS)
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
      this.resetResponseToggle()
      this.updateResponseCode(statusCode)
      this.updateStatus(`Error ${statusCode}`, color)
      this.finishProgressArc(color)
      vibrateError()
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
      if (!this.canStartAction()) {
        return
      }
      if (!this.state.config || !this.state.config.endpoint_url || !this.state.config.endpoint_url.trim()) {
        this.showNoEndpointScreen()
        return
      }

      this.beginAction()
      this.state.showResponse = false
      this.state.lastResponseBody = ""
      if (this.responseToggleButton) {
        this.responseToggleButton.setProperty(prop.VISIBLE, 0)
      }
      const config = this.state.config
      const endpointUrl = String(config.endpoint_url).trim()
      if (endpointUrl.toLowerCase().startsWith("http://")) {
        showToast({ content: "HTTP not encrypted" })
      }
      const requestBody = this.buildPayload(text, config)
      const headers = this.buildHeaders(config)

      this.updateStatus("Sending...", COLOR.NEUTRAL)
      this.resultWidget.setProperty(prop.VISIBLE, 0)
      this.updateButtons(false, false)
      this.showProgressArcSending()
      vibrateSendStart()

      this.httpRequest({
        url: endpointUrl,
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        timeout: HTTP_TIMEOUT_MS
      })
        .then((response) => {
          const statusCode = response && typeof response.status === "number" ? response.status : 200
          if (statusCode >= 400) {
            this.handleHttpErrorStatus(statusCode)
            this.endAction()
            return
          }

          this.updateResponseCode(statusCode)
          this.updateStatus("Sent", COLOR.SUCCESS)
          showToast({ content: "Sent" })
          this.finishProgressArc(COLOR.SUCCESS)
          vibrateSuccess()
          this.showSendSuccessScreen(response)
          this.endAction()
        })
        .catch((error) => {
          logger.error("Send error", JSON.stringify(error))
          if (error && typeof error.status === "number") {
            this.handleHttpErrorStatus(error.status)
            this.endAction()
            return
          }
          const errorBody = this.parseErrorBody(error)
          if (this.isSuccessLikePayload(errorBody)) {
            this.updateResponseCode("UNK")
            this.updateStatus("Sent", COLOR.SUCCESS)
            showToast({ content: "Sent" })
            this.finishProgressArc(COLOR.SUCCESS)
            vibrateSuccess()
            this.state.lastResponseBody = errorBody
            this.state.showResponse = false
            this.resultWidget.setProperty(prop.TEXT, "")
            this.resultWidget.setProperty(prop.VISIBLE, 0)
            if (errorBody) {
              this.responseToggleButton.setProperty(prop.VISIBLE, 1)
              this.responseToggleButton.setProperty(prop.TEXT, "Show response")
            }
            this.updateSuccessLayout()
            this.updateButtons(true, false, "Repeat", REPEAT_SUCCESS_HIDDEN_Y)
            this.endAction()
            return
          }
          this.resetResponseToggle()
          this.updateResponseCode("NET")
          this.updateStatus("No connection", COLOR.WARNING)
          this.finishProgressArc(COLOR.ERROR_4XX)
          vibrateError()
          showToast({ content: "Error" })
          this.updateButtons(true, true)
          this.endAction()
        })
    }
  })
)
