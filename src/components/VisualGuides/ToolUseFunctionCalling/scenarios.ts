import type { Scenario } from "./types";

/**
 * Hand-authored, SIMULATED traces. Every trace is rendered under a visible
 * "Simulated trace" label; none of these messages are live model output.
 * The calculator result is real arithmetic (1284 * 7391 = 9490044); the
 * weather and database payloads are illustrative values.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "weather",
    label: "Weather lookup",
    toolSummary: "get_weather(location, unit)",
    color: "#3bb4a4",
    steps: [
      {
        role: "user",
        actor: "user",
        text: "What's the weather in Oslo right now?",
        annotation:
          "The runtime sends this message to the model along with the list of available tool definitions. The model has no live weather data of its own.",
      },
      {
        role: "tool_call",
        actor: "model",
        toolName: "get_weather",
        argsJson: `{
  "location": "Oslo, Norway",
  "unit": "celsius"
}`,
        annotation:
          "The MODEL only emits this structured JSON. It does not contact any weather service. Deciding to call, picking the tool, and filling the arguments is the model's entire job here.",
      },
      {
        role: "tool_result",
        actor: "runtime",
        resultJson: `{
  "location": "Oslo, Norway",
  "temperature_c": 17,
  "condition": "partly cloudy",
  "wind_kph": 14
}`,
        annotation:
          "The RUNTIME (your code) validated the arguments, called the real weather API, and appended this result to the conversation. Illustrative payload.",
      },
      {
        role: "final",
        actor: "model",
        text: "It is currently 17 degrees Celsius and partly cloudy in Oslo, with wind around 14 km/h.",
        annotation:
          "The MODEL reads the tool result now sitting in the conversation and writes an answer grounded in it. Every number here traces back to the result above.",
      },
    ],
  },
  {
    id: "calculator",
    label: "Calculator",
    toolSummary: "calculate(expression)",
    color: "#a855f7",
    steps: [
      {
        role: "user",
        actor: "user",
        text: "What is 1284 * 7391? I need the exact number.",
        annotation:
          "The runtime forwards the question plus the tool definitions. LLMs predict tokens; they do not run an arithmetic unit, so large multiplications are unreliable without a tool.",
      },
      {
        role: "tool_call",
        actor: "model",
        toolName: "calculate",
        argsJson: `{
  "expression": "1284 * 7391"
}`,
        annotation:
          "The MODEL recognises this needs exact arithmetic and emits a call instead of guessing digits. Still just JSON: nothing has been computed yet.",
      },
      {
        role: "tool_result",
        actor: "runtime",
        resultJson: `{
  "result": 9490044
}`,
        annotation:
          "The RUNTIME evaluated the expression with a real calculator (this value is the true product) and returned it as a tool result message.",
      },
      {
        role: "final",
        actor: "model",
        text: "1284 * 7391 = 9,490,044.",
        annotation:
          "The MODEL copies the exact figure from the tool result into a readable answer. It never had to do the multiplication itself.",
      },
    ],
  },
  {
    id: "database",
    label: "Database query",
    toolSummary: "query_database(sql)",
    color: "#1e5d8a",
    steps: [
      {
        role: "user",
        actor: "user",
        text: "How many orders did we ship in the last 7 days?",
        annotation:
          "The runtime sends the question with the tool definitions. Company data lives in a database the model has never seen; only a tool can reach it.",
      },
      {
        role: "tool_call",
        actor: "model",
        toolName: "query_database",
        argsJson: `{
  "sql": "SELECT COUNT(*) AS shipped FROM orders WHERE status = 'shipped' AND shipped_at >= date('now', '-7 days')"
}`,
        annotation:
          "The MODEL translates the question into SQL and emits it as arguments. A careful runtime restricts this tool to read-only queries before executing anything.",
      },
      {
        role: "tool_result",
        actor: "runtime",
        resultJson: `{
  "rows": [
    { "shipped": 342 }
  ]
}`,
        annotation:
          "The RUNTIME ran the query against the real database and returned the rows. Illustrative payload.",
      },
      {
        role: "final",
        actor: "model",
        text: "You shipped 342 orders in the last 7 days, based on the orders table.",
        annotation:
          "The MODEL grounds its answer in the returned rows and says where the number came from, so the claim is checkable.",
      },
    ],
  },
];
