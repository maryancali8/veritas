const SYSTEM_PROMPT = `You are Veritas, a forensic media analyst. Your job is to detect bias and manipulation in media content. Return valid JSON only, nothing else. No markdown, no backticks, just the raw JSON object.

Rules:
- credibility_score must be a whole number between 1 and 10. Never a decimal. Never outside that range.
- You are a forensic analyst. You report facts. You do not sanitise or protect anyone's reputation.
- Before flagging language as biased, ask yourself: if the events described are factually true, does this language accurately describe them? If yes, do not flag it as bias. Accurate language describing real events is not manipulation.
- Only flag language as manipulative if it distorts, exaggerates, or frames facts to serve an agenda beyond what the facts support.
- Quotation marks around a word indicate the source is quoting someone or using the term deliberately. This is not automatically sensationalism.
- The cleaned_version is not a softer rewrite. It is a more precise one. Remove opinion, agenda and emotional framing. But never replace accurate words with weaker ones. If "spy" is what happened, "spy" stays. The cleaned version must be at least as factually strong as the original.
- If no meaningful bias is found, say so clearly and give a high credibility score.

{
  "bias_found": true,
  "bias_direction": "string",
  "categories": ["string"],
  "manipulation_techniques": [{"name":"string", "explanation":"string"}],
  "psychological_principles": ["string"],
  "how_bias_compromises": "string",
  "highlighted_sentences": [{"sentence":"exact string", "category":"string"}],
  "cleaned_version": "string",
  "credibility_score": 0,
  "credibility_reasoning": "string"
}`;

function getVerdictLabel(score) {
  if (score <= 2) return "Garbage";
  if (score <= 4) return "Bullshit";
  if (score <= 6) return "Questionable";
  if (score <= 8) return "Solid";
  return "Rock Solid";
}

function goBack() {
  document.getElementById('resultsPage').classList.add('hidden');
  document.getElementById('inputPage').classList.remove('hidden');
}

async function analyse() {
  const overlay = document.getElementById('loadingOverlay');
  const userContent = document.getElementById('rawTextContent').value;
  const apiKey = document.getElementById('apiKeyInput').value.trim();

  if (!apiKey) return alert("Please enter your Groq API key.");
  if (!userContent) return alert("Please enter some text.");

  try {
    overlay.classList.remove('hidden');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'Analyse this: ' + userContent }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const rawText = data.choices[0].message.content;
    const result = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    document.getElementById('scoreNumber').textContent = result.credibility_score;
    document.getElementById('verdictLabel').textContent = getVerdictLabel(result.credibility_score);
    document.getElementById('scoreReasoning').textContent = result.credibility_reasoning;
    document.getElementById('biasDirection').textContent = result.bias_direction;
    document.getElementById('cleanedVersion').textContent = result.cleaned_version;

    document.getElementById('categoriesBadges').innerHTML = result.categories
      .map(c => `<span class="badge">${c}</span>`).join('');

    document.getElementById('techniquesList').innerHTML = result.manipulation_techniques
      .map(t => `<p><strong>${t.name}:</strong> ${t.explanation}</p>`).join('');

    document.getElementById('highlightedText').innerHTML = result.highlighted_sentences
      .map(s => `<div class="highlight-item"><p class="highlight-sentence">"${s.sentence}"</p><p class="highlight-category">${s.category}</p></div>`).join('');

    document.getElementById('inputPage').classList.add('hidden');
    document.getElementById('resultsPage').classList.remove('hidden');

  } catch (err) {
    console.error("Error:", err);
    alert("Something went wrong: " + err.message);
  } finally {
    overlay.classList.add('hidden');
  }
}
