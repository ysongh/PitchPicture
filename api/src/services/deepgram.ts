export async function transcribeWithDeepgram(
  audio: Buffer,
  contentType = 'audio/webm'
): Promise<string> {
  const response = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': contentType,
      },
      body: audio,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Deepgram error: ${response.status} ${await response.text()}`
    );
  }

  const data = (await response.json()) as {
    results: { channels: Array<{ alternatives: Array<{ transcript: string }> }> };
  };
  return data.results.channels[0].alternatives[0].transcript;
}
