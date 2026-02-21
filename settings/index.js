AppSettingsPage({
  build(props) {
    return Section({}, [
      TextInput({
        label: 'Endpoint URL',
        settingsKey: 'endpoint_url',
        placeholder: 'https://your-api.com/webhook',
        sublabel: 'Target webhook or API endpoint URL'
      }),
      TextInput({
        label: 'Authorization',
        settingsKey: 'auth_token',
        placeholder: 'Bearer your-token',
        sublabel: 'Full Authorization header value (e.g. Bearer xxx). Leave empty for no auth.'
      }),
      TextInput({
        label: 'JSON Key',
        settingsKey: 'payload_key',
        placeholder: 'message',
        sublabel: 'JSON field name for the text payload (e.g. message)'
      }),
      TextInput({
        label: 'Sender Identifier',
        settingsKey: 'sender_id',
        placeholder: 'watch-user',
        sublabel: 'Optional sender label included in the payload'
      }),
      Text({
        paragraph: true,
        content: 'Voice Bridge sends transcribed text as a JSON POST to the configured endpoint.'
      })
    ])
  }
})
