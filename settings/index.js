/**
 * Shared section style for visual grouping in settings.
 */
const SECTION_STYLE = {
  marginBottom: "10px"
}

/**
 * Intro text style shown at the top of settings page.
 */
const HEADER_TEXT_STYLE = {
  fontSize: "12px",
  color: "#5f6775",
  lineHeight: "18px",
  marginBottom: "10px"
}

/**
 * Secondary helper text style for less prominent information.
 */
const FOOTER_TEXT_STYLE = {
  fontSize: "11px",
  color: "#6b7280",
  lineHeight: "16px",
  marginTop: "6px"
}

/**
 * Text input label style for stronger hierarchy.
 */
const INPUT_LABEL_STYLE = {
  fontSize: "13px"
}

/**
 * Text input sublabel style for descriptions below fields.
 */
const INPUT_SUB_STYLE = {
  fontSize: "11px",
  color: "#6b7280",
  lineHeight: "16px"
}

/**
 * Renders application settings for Voice Bridge.
 *
 * @returns {void}
 */
AppSettingsPage({
  build(props) {
    return Section({}, [
      Text(
        {
          paragraph: true,
          style: HEADER_TEXT_STYLE
        },
        "Quick setup for voice-to-webhook delivery."
      ),
      Section(
        {
          title: "Endpoint",
          style: SECTION_STYLE
        },
        [
          Text(
            {
              paragraph: true,
              style: FOOTER_TEXT_STYLE
            },
            "Where your message should be sent."
          ),
          TextInput({
            label: "Endpoint URL",
            settingsKey: "endpoint_url",
            placeholder: "https://your-api.com/webhook",
            sublabel: "Webhook or API URL.",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          }),
          TextInput({
            label: "Authorization",
            settingsKey: "auth_token",
            placeholder: "Bearer your-token",
            sublabel: "Full Authorization value, e.g. Bearer xxx.",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          })
        ]
      ),
      Section(
        {
          title: "Payload",
          style: SECTION_STYLE
        },
        [
          Text(
            {
              paragraph: true,
              style: FOOTER_TEXT_STYLE
            },
            "Define JSON fields sent to your endpoint."
          ),
          TextInput({
            label: "JSON Key",
            settingsKey: "payload_key",
            placeholder: "message",
            sublabel: "Field name for transcribed text.",
            labelStyle: INPUT_LABEL_STYLE,
            subStyle: INPUT_SUB_STYLE
          }),
          TextInput({
            label: "Sender Identifier",
            settingsKey: "sender_id",
            placeholder: "watch-user",
            sublabel: "Optional sender label.",
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
            "When enabled, requests include Unix timestamp in seconds."
          )
        ]
      ),
      Text(
        {
          paragraph: true,
          style: FOOTER_TEXT_STYLE
        },
        "Privacy: no message history is stored on the watch."
      )
    ])
  }
})
