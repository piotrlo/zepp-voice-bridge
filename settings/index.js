AppSettingsPage({
  build(props) {
    return Section({}, [
      TextInput({
        label: 'Endpoint URL',
        settingsKey: 'endpoint_url',
        placeholder: 'https://your-api.com/webhook',
        sublabel: 'Adres URL endpointu docelowego'
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
        sublabel: 'Klucz pola tekstu w JSON (np. message)'
      }),
      TextInput({
        label: 'Sender Identifier',
        settingsKey: 'sender_id',
        placeholder: 'watch-user',
        sublabel: 'Opcjonalny identyfikator nadawcy'
      }),
      Text({
        paragraph: true,
        content: 'VoiceBridge wysyła transkrybowany tekst jako JSON POST pod podany endpoint.'
      })
    ])
  }
})
