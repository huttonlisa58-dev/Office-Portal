// AI features. Two layers:
//  1) Deterministic statistical anomaly detection (works offline, no API key).
//  2) Optional LLM layer for the HR assistant / natural-language explanations.

// --- Attendance anomaly detection (z-score on check-in time + worked minutes) ---
export function detectAttendanceAnomalies(records = []) {
  // records: [{ date, checkInMinutes, workedMinutes }]
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const std = (xs, m) => Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) || 1;

  const ci = records.map((r) => r.checkInMinutes ?? 0);
  const wm = records.map((r) => r.workedMinutes ?? 0);
  const ciMean = mean(ci), ciStd = std(ci, ciMean);
  const wmMean = mean(wm), wmStd = std(wm, wmMean);

  return records.map((r) => {
    const ciZ = Math.abs(((r.checkInMinutes ?? 0) - ciMean) / ciStd);
    const wmZ = Math.abs(((r.workedMinutes ?? 0) - wmMean) / wmStd);
    const score = Number(Math.max(ciZ, wmZ).toFixed(2));
    let reason = null;
    if (ciZ >= 2) reason = 'Unusual check-in time vs personal baseline';
    else if (wmZ >= 2) reason = 'Unusual worked hours vs personal baseline';
    return { ...r, anomalyScore: score, anomalyReason: score >= 2 ? reason : null };
  });
}

// --- Optional LLM HR assistant ---
// SCAFFOLD: set ANTHROPIC_API_KEY. Returns a canned reply in dev so the UI works offline.
export async function hrAssistantReply({ question, context }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `Assistant (dev mode): "${question}". Configure ANTHROPIC_API_KEY to enable live answers.`;
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: 'You are an HR assistant for a single company. Use only the provided context. Be concise.',
      messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }],
    }),
  });
  const data = await res.json();
  return data?.content?.find((c) => c.type === 'text')?.text || 'No answer.';
}
