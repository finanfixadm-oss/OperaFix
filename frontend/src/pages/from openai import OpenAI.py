from openai import OpenAI

client = OpenAI(
  api_key="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"
)

response = client.responses.create(
  model="gpt-5.4-mini",
  input="write a haiku about ai",
  store=True,
)

print(response.output_text);
