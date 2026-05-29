import { BaseSideService, settingsLib } from "@zeppos/zml/base-side"

const DEFAULT_CONFIG = {
  endpoint_url: "",
  auth_token: "",
  payload_key: "message",
  sender_id: "",
  include_timestamp: false
}

const TEST_MESSAGE = "Voice Bridge test"
const HTTP_TEST_TIMEOUT_MS = 10000

/**
 * Trims whitespace from a settings value; empty after trim falls back to default.
 *
 * @param {string|undefined|null} value - Raw value from settingsLib.
 * @param {string} fallback - Default when value is missing or blank.
 * @returns {string}
 */
function trimSetting(value, fallback) {
  if (value == null) {
    return fallback
  }
  const trimmed = String(value).trim()
  return trimmed === "" ? fallback : trimmed
}

/**
 * Builds endpoint configuration from phone settings with fallback defaults.
 *
 * @returns {{endpoint_url: string, auth_token: string, payload_key: string, sender_id: string, include_timestamp: boolean}}
 */
function getConfig() {
  const includeTimestampRaw = settingsLib.getItem("include_timestamp")

  return {
    endpoint_url: trimSetting(settingsLib.getItem("endpoint_url"), DEFAULT_CONFIG.endpoint_url),
    auth_token: trimSetting(settingsLib.getItem("auth_token"), DEFAULT_CONFIG.auth_token),
    payload_key: trimSetting(settingsLib.getItem("payload_key"), DEFAULT_CONFIG.payload_key),
    sender_id: trimSetting(settingsLib.getItem("sender_id"), DEFAULT_CONFIG.sender_id),
    include_timestamp: includeTimestampRaw === "true" || includeTimestampRaw === true
  }
}

/**
 * Builds JSON payload for test or live requests.
 *
 * @param {string} text - Message text to send.
 * @param {{payload_key?: string, sender_id?: string, include_timestamp?: boolean}} config - Endpoint configuration.
 * @returns {Record<string, string|number>}
 */
function buildPayload(text, config) {
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
}

/**
 * Builds HTTP headers from configuration.
 *
 * @param {{auth_token?: string}} config - Endpoint configuration.
 * @returns {Record<string, string>}
 */
function buildHeaders(config) {
  const headers = { "Content-Type": "application/json" }
  if (config.auth_token) {
    headers.Authorization = config.auth_token
  }
  return headers
}

/**
 * Persists the latest test connection status for the settings UI.
 *
 * @param {string} message - Human-readable status line.
 * @returns {void}
 */
function setTestConnectionStatus(message) {
  settingsLib.setItem("test_connection_status", message)
}

AppSideService(
  BaseSideService({
    onInit() {},
    /**
     * Handles watch requests and returns current VoiceBridge configuration.
     *
     * @param {{method: string}} req - Request descriptor from watch page.
     * @param {(error: null|Error, payload: {result: string}) => void} res - Side-service response callback.
     * @returns {void}
     */
    onRequest(req, res) {
      if (req.method === "GET_CONFIG") {
        res(null, { result: JSON.stringify(getConfig()) })
      }
    },
    /**
     * Reacts to settings changes, including test connection triggers from the settings page.
     *
     * @param {{key: string, newValue: unknown}} change - Settings storage change event.
     * @returns {void}
     */
    onSettingsChange({ key, newValue }) {
      if (key === "test_connection_trigger" && newValue) {
        this.runTestConnection()
      }
    },
    /**
     * Sends a sample POST payload to the configured endpoint and stores the result.
     *
     * @returns {Promise<void>}
     */
    async runTestConnection() {
      const config = getConfig()
      const endpointUrl = String(config.endpoint_url || "").trim()

      if (!endpointUrl) {
        setTestConnectionStatus("Add an endpoint URL first.")
        return
      }

      setTestConnectionStatus("Sending test...")

      try {
        const response = await this.fetch({
          url: endpointUrl,
          method: "POST",
          headers: buildHeaders(config),
          body: JSON.stringify(buildPayload(TEST_MESSAGE, config)),
          timeout: HTTP_TEST_TIMEOUT_MS
        })

        const statusCode =
          response && typeof response.status === "number" ? response.status : 200

        if (statusCode >= 400) {
          setTestConnectionStatus(`Test failed: HTTP ${statusCode}`)
          return
        }

        setTestConnectionStatus(`Test OK: HTTP ${statusCode}`)
      } catch (error) {
        const statusCode = error && typeof error.status === "number" ? error.status : null
        if (statusCode) {
          setTestConnectionStatus(`Test failed: HTTP ${statusCode}`)
          return
        }
        setTestConnectionStatus("Test failed: no connection")
      }
    },
    onRun() {},
    onDestroy() {}
  })
)
