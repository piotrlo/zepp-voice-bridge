import { BaseSideService, settingsLib } from "@zeppos/zml/base-side"

const DEFAULT_CONFIG = {
  endpoint_url: "",
  auth_token: "",
  payload_key: "message",
  sender_id: "",
  include_timestamp: false
}

/**
 * Builds endpoint configuration from phone settings with fallback defaults.
 *
 * @returns {{endpoint_url: string, auth_token: string, payload_key: string, sender_id: string, include_timestamp: boolean}}
 */
function getConfig() {
  const includeTimestampRaw = settingsLib.getItem("include_timestamp")

  return {
    endpoint_url: settingsLib.getItem("endpoint_url") || DEFAULT_CONFIG.endpoint_url,
    auth_token: settingsLib.getItem("auth_token") || DEFAULT_CONFIG.auth_token,
    payload_key: settingsLib.getItem("payload_key") || DEFAULT_CONFIG.payload_key,
    sender_id: settingsLib.getItem("sender_id") || DEFAULT_CONFIG.sender_id,
    include_timestamp: includeTimestampRaw === "true" || includeTimestampRaw === true
  }
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
    onRun() {},
    onDestroy() {}
  })
)
