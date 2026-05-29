/**
 * Shared section style for visual grouping in settings.
 */
const SECTION_STYLE = {
  marginBottom: "16px"
}

/**
 * Intro and section description text style.
 */
const HEADER_TEXT_STYLE = {
  fontSize: "13px",
  color: "#4b5563",
  lineHeight: "18px",
  marginBottom: "8px"
}

/**
 * Secondary helper text style for less prominent information.
 */
const FOOTER_TEXT_STYLE = {
  fontSize: "11px",
  color: "#9ca3af",
  lineHeight: "16px",
  marginTop: "4px"
}

/**
 * Warning style for insecure HTTP endpoint URLs.
 */
const HTTP_WARNING_STYLE = {
  fontSize: "12px",
  color: "#c2410c",
  lineHeight: "18px",
  marginTop: "8px",
  marginBottom: "4px"
}

/**
 * Text input label style for stronger hierarchy.
 */
const INPUT_LABEL_STYLE = {
  fontSize: "14px",
  fontWeight: "bold"
}

/**
 * Text input sublabel style for descriptions below fields.
 */
const INPUT_SUB_STYLE = {
  fontSize: "11px",
  color: "#9ca3af",
  lineHeight: "16px"
}

/**
 * Status text style for test connection results.
 */
const TEST_STATUS_STYLE = {
  fontSize: "12px",
  color: "#4b5563",
  lineHeight: "18px",
  marginTop: "8px"
}

/**
 * Returns true when the endpoint URL uses plain HTTP (not HTTPS).
 *
 * @param {string} url - Endpoint URL from settings storage.
 * @returns {boolean}
 */
function isInsecureHttpUrl(url) {
  return String(url || "")
    .trim()
    .toLowerCase()
    .startsWith("http://")
}

/**
 * Renders application settings for Voice Bridge.
 *
 * @returns {void}
 */
AppSettingsPage({
  build(props) {
    const endpointUrl = String(props.settingsStorage.getItem("endpoint_url") || "").trim()
    const showHttpWarning = isInsecureHttpUrl(endpointUrl)
    const testStatus = String(props.settingsStorage.getItem("test_connection_status") || "").trim()

    return Section({}, [
      Section(
        {
          title: "📍 Endpoint",
          style: SECTION_STYLE
        },
        [
          Text(
            {
              paragraph: true,
              style: HEADER_TEXT_STYLE
            },
            "Where to send your voice transcript."
          ),
          TextInput({
            label: "Endpoint URL",
            settingsKey: "endpoint_url",
            placeholder: "https://example.com/webhook",
            sublabel: "HTTPS required in production",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          }),
          ...(showHttpWarning
            ? [
                Text(
                  {
                    paragraph: true,
                    style: HTTP_WARNING_STYLE
                  },
                  "⚠️ HTTP is not encrypted"
                )
              ]
            : []),
          TextInput({
            label: "Authorization",
            settingsKey: "auth_token",
            placeholder: "Bearer your-token",
            sublabel: "Optional. Full Authorization header value",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          })
        ]
      ),
      Section(
        {
          title: "📦 Payload",
          style: SECTION_STYLE
        },
        [
          Text(
            {
              paragraph: true,
              style: HEADER_TEXT_STYLE
            },
            "Customize the JSON body sent to your endpoint."
          ),
          TextInput({
            label: "JSON Key",
            settingsKey: "payload_key",
            placeholder: "message",
            sublabel: "Field name for the transcribed text",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          }),
          TextInput({
            label: "Sender ID",
            settingsKey: "sender_id",
            placeholder: "watch-user",
            sublabel: "Optional label identifying the sender",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          }),
          Toggle({
            label: "Include Timestamp",
            settingsKey: "include_timestamp"
          }),
          Text(
            {
              paragraph: true,
              style: FOOTER_TEXT_STYLE
            },
            "Adds Unix timestamp (seconds) to each request"
          )
        ]
      ),
      Section(
        {
          title: "🧪 Test Connection",
          style: SECTION_STYLE
        },
        [
          Text(
            {
              paragraph: true,
              style: HEADER_TEXT_STYLE
            },
            "Send a test payload to verify your endpoint."
          ),
          Button({
            label: "Send Test POST",
            style: {
              fontSize: "14px",
              borderRadius: "8px",
              background: "#2d7dff",
              color: "#ffffff"
            },
            onClick() {
              props.settingsStorage.setItem("test_connection_status", "Sending test...")
              props.settingsStorage.setItem("test_connection_trigger", String(Date.now()))
            }
          }),
          ...(testStatus
            ? [
                Text(
                  {
                    paragraph: true,
                    style: TEST_STATUS_STYLE
                  },
                  testStatus
                )
              ]
            : [])
        ]
      )
    ])
  }
})
