// Helper to clean up any markdown code block wrapper from AI outputs
const extractJSON = (text) => {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText.trim());
};

export const aiService = {
    fetchOpenRouterModels: async () => {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models');
            if (!response.ok) {
                throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`);
            }
            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                return data.data.map(model => {
                    const isFree = parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0;
                    return {
                        id: model.id,
                        name: model.name || model.id,
                        isFree: isFree,
                        promptPrice: model.pricing.prompt,
                        completionPrice: model.pricing.completion
                    };
                });
            }
            return [];
        } catch (error) {
            console.error('Error fetching OpenRouter models:', error);
            throw error;
        }
    },

    // 1. Task Mode: Generates JSON-formatted tasks
    generateTasks: async ({
        provider,
        apiKey,
        model,
        goal,
        existingTasks = [],
        chatHistory = [],
        userFeedback = '',
        currentDate = new Date().toISOString().split('T')[0],
        corsProxy
    }) => {
        if (!apiKey) {
            throw new Error(`API Key for ${provider === 'gemini' ? 'Gemini' : (provider === 'nvidia' ? 'Nvidia NIM' : 'OpenRouter')} is missing. Please configure it in Settings.`);
        }
        const cleanKey = apiKey.trim();

        const systemInstructions = `You are a professional personal development coach and tutor.
Your task is to break down the user's recurring learning goal into a highly structured, concrete set of 3 to 6 tasks for the upcoming week.

The recurring goal is:
- Title: "${goal.title}"
- Description: "${goal.description}"
- Category: "${goal.category || ''}"

Here are the user's existing tasks for this goal (do not repeat these exactly, build upon them):
${JSON.stringify(existingTasks.map(t => ({ title: t.title, status: t.status })), null, 2)}

Today's date is: ${currentDate}. Recommended due dates for the generated tasks must be scheduled for next week (spread them across the next 7 days, starting from tomorrow ${currentDate}).

You MUST return a JSON array containing task objects. Do not wrap the JSON in Markdown code block formatting. Return ONLY the raw JSON string.

Each task object in the JSON array must follow this schema:
{
  "title": "Task title (e.g. Learn Python Variables)",
  "description": "Short, actionable description of what to do (e.g. Read chapter 2, write 3 scripts using strings and numbers)",
  "dueDate": "YYYY-MM-DD (spread out over the next week)",
  "priority": "high" | "medium" | "low",
  "estimatedHours": number (e.g. 1.5)
}`;

        // Map standard message roles to provider models
        let promptText = "";
        if (chatHistory && chatHistory.length > 0) {
            promptText += "Here is our discussion history about the goal:\n";
            chatHistory.forEach(msg => {
                promptText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
            promptText += "\nBased on the discussion above, ";
        }

        promptText += userFeedback 
            ? `I want to refine my tasks for this goal. Here is my feedback: "${userFeedback}". Please regenerate or adjust the tasks accordingly.`
            : `Please generate my tasks for the next week for this goal.`;

        if (provider === 'gemini') {
            const geminiModel = model || 'gemini-1.5-flash';
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: systemInstructions + '\n\n' + promptText }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error("Empty response received from Gemini API.");
            }

            try {
                return extractJSON(text);
            } catch (parseError) {
                console.error("Failed to parse Gemini output as JSON. Output was:", text);
                throw new Error("AI output was not in the expected JSON format. Please try again.");
            }

        } else if (provider === 'nvidia') {
            const nvidiaModel = model || 'openai/gpt-oss-120b';
            let url = 'https://verecel-mongo.vercel.app/api/nvidia/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`
                },
                body: JSON.stringify({
                    model: nvidiaModel,
                    messages: [
                        {
                            role: 'system',
                            content: systemInstructions
                        },
                        {
                            role: 'user',
                            content: promptText
                        }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Nvidia NIM API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response received from Nvidia NIM API.");
            }

            try {
                const parsed = extractJSON(text);
                if (Array.isArray(parsed)) {
                    return parsed;
                } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
                    return parsed.tasks;
                } else {
                    return Object.values(parsed).find(val => Array.isArray(val)) || [parsed];
                }
            } catch (parseError) {
                console.error("Failed to parse Nvidia NIM output as JSON. Output was:", text);
                throw new Error("AI output was not in the expected JSON format. Please try again.", { cause: parseError });
            }

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            let url = 'https://openrouter.ai/api/v1/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'AI Task Generator Tracker'
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: [
                        {
                            role: 'system',
                            content: systemInstructions
                        },
                        {
                            role: 'user',
                            content: promptText
                        }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response received from OpenRouter API.");
            }

            try {
                const parsed = extractJSON(text);
                if (Array.isArray(parsed)) {
                    return parsed;
                } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
                    return parsed.tasks;
                } else {
                    return Object.values(parsed).find(val => Array.isArray(val)) || [parsed];
                }
            } catch (parseError) {
                console.error("Failed to parse OpenRouter output as JSON. Output was:", text);
                throw new Error("AI output was not in the expected JSON format. Please try again.");
            }
        }
    },

    // 2. Chat Support Mode: standard conversational assistant supporting Markdown & LaTeX
    chatSupport: async ({
        provider,
        apiKey,
        model,
        goal,
        chatHistory = [],
        corsProxy
    }) => {
        if (!apiKey) {
            throw new Error(`API Key for ${provider === 'gemini' ? 'Gemini' : (provider === 'nvidia' ? 'Nvidia NIM' : 'OpenRouter')} is missing. Please configure it in Settings.`);
        }
        const cleanKey = apiKey.trim();

        const systemInstructions = `You are a personal learning coach and expert tutor.
The user is working on their recurring goal: "${goal.title}" (${goal.description || 'No description'}).
Answer questions, clarify concepts, suggest resources, and help them plan their studies.
Feel free to format mathematical equations in standard LaTeX notation using single dollars for inline math (e.g. $E=mc^2$) and double dollars for block math (e.g. $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$).
Provide detailed, structured responses formatted in Markdown.`;

        if (provider === 'gemini') {
            const geminiModel = model || 'gemini-1.5-flash';
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;
            if (corsProxy) {
                url = corsProxy + url;
            }

            // Format chat log into Gemini contents
            const contents = chatHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            // Prepend system prompt inside user's first turn or system instruction
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: {
                        parts: [{ text: systemInstructions }]
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error("Empty response received from Gemini API.");
            }
            return text;

        } else if (provider === 'nvidia') {
            const nvidiaModel = model || 'openai/gpt-oss-120b';
            let url = 'https://verecel-mongo.vercel.app/api/nvidia/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            // Format chat history for standard chat completions
            const messages = [
                { role: 'system', content: systemInstructions },
                ...chatHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }))
            ];

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`
                },
                body: JSON.stringify({
                    model: nvidiaModel,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Nvidia NIM API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            let text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response received from Nvidia NIM API.");
            }

            const reasoning = data.choices?.[0]?.message?.reasoning_content;
            if (reasoning) {
                text = `> **Reasoning Process:**\n> ${reasoning.split('\n').join('\n> ')}\n\n${text}`;
            }
            return text;

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            let url = 'https://openrouter.ai/api/v1/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            // Format chat history for standard chat completions
            const messages = [
                { role: 'system', content: systemInstructions },
                ...chatHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }))
            ];

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'AI Task Generator Tracker'
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response received from OpenRouter API.");
            }
            return text;
        }
    },

    // 3. Inline tutoring on a specific task
    getTaskHelp: async ({
        provider,
        apiKey,
        model,
        goal,
        task,
        corsProxy
    }) => {
        if (!apiKey) {
            throw new Error(`API Key for ${provider === 'gemini' ? 'Gemini' : (provider === 'nvidia' ? 'Nvidia NIM' : 'OpenRouter')} is missing. Please configure it in Settings.`);
        }
        const cleanKey = apiKey.trim();

        const prompt = `You are a professional tutor and learning coach.
The user is working on their goal: "${goal.title}" (${goal.description || 'No description'}).
They need help, start ideas, and resources to complete this specific task:
- Task: "${task.title}"
- Details: "${task.description || 'No details provided'}"
- Priority: ${task.priority || 'medium'}
- Estimated duration: ${task.estimatedHours || 1} hours

Please provide:
1. A clear, step-by-step plan on how to start and complete this task.
2. Coding or practical examples if relevant (e.g. sample Python code if learning Python).
3. Recommended references, tutorials, or study tools.
4. Tips for overcoming common roadblocks on this topic.

Format mathematical equations in standard LaTeX notation using single dollars for inline math (e.g. $E=mc^2$) and double dollars for block math.
Keep your response concise, encouraging, and formatted in clear Markdown.`;

        if (provider === 'gemini') {
            const geminiModel = model || 'gemini-1.5-flash';
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error("Empty response received from Gemini API.");
            }
            return text;

        } else if (provider === 'nvidia') {
            const nvidiaModel = model || 'openai/gpt-oss-120b';
            let url = 'https://verecel-mongo.vercel.app/api/nvidia/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`
                },
                body: JSON.stringify({
                    model: nvidiaModel,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Nvidia NIM API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            let text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response received from Nvidia NIM API.");
            }

            const reasoning = data.choices?.[0]?.message?.reasoning_content;
            if (reasoning) {
                text = `> **Reasoning Process:**\n> ${reasoning.split('\n').join('\n> ')}\n\n${text}`;
            }
            return text;

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            let url = 'https://openrouter.ai/api/v1/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'AI Task Generator Tracker'
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error("Empty response received from OpenRouter.");
            }
            return text;
        }
    },

    testConnection: async ({ provider, apiKey, model, corsProxy }) => {
        if (!apiKey) {
            throw new Error("API Key is missing.");
        }
        const cleanKey = apiKey.trim();

        if (provider === 'gemini') {
            const geminiModel = model || 'gemini-2.5-flash';
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: "Ping" }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 5
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errText}`);
            }
            return { success: true, message: "Gemini Key validated successfully!" };

        } else if (provider === 'nvidia') {
            const nvidiaModel = model || 'openai/gpt-oss-120b';
            let url = 'https://verecel-mongo.vercel.app/api/nvidia/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`
                },
                body: JSON.stringify({
                    model: nvidiaModel,
                    messages: [
                        {
                            role: 'user',
                            content: "Ping"
                        }
                    ],
                    max_tokens: 5
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Nvidia NIM API error: ${response.status} - ${errText}`);
            }
            return { success: true, message: "Nvidia NIM Key validated successfully!" };

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            let url = 'https://openrouter.ai/api/v1/chat/completions';
            if (corsProxy) {
                url = corsProxy + url;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'AI Task Generator Tracker'
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: [
                        {
                            role: 'user',
                            content: "Ping"
                        }
                    ],
                    max_tokens: 5
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
            }
            return { success: true, message: "OpenRouter Key validated successfully!" };
        }
    }
};

export const DEFAULT_EXTERNAL_AI_TOOLS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    redirectionMethod: 'direct',
    urlTemplate: 'https://chatgpt.com/?q={query}&hints=search&temporary-chat=true',
    customInstructions: ''
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    redirectionMethod: 'direct',
    urlTemplate: 'https://www.perplexity.ai/search?q={query}',
    customInstructions: ''
  },
  {
    id: 'google-search',
    name: 'Google Search',
    redirectionMethod: 'direct',
    urlTemplate: 'https://www.google.com/search?q={query}',
    customInstructions: ''
  },
  {
    id: 'duck-ai',
    name: 'Duck AI',
    redirectionMethod: 'direct',
    urlTemplate: 'https://duckduckgo.com/?q={query}&ia=chat',
    customInstructions: ''
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    redirectionMethod: 'direct',
    urlTemplate: 'https://search.brave.com/search?q={query}',
    customInstructions: ''
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    redirectionMethod: 'direct',
    urlTemplate: 'https://chat.mistral.ai/chat?q={query}',
    customInstructions: ''
  },
  {
    id: 'grok',
    name: 'Grok AI',
    redirectionMethod: 'direct',
    urlTemplate: 'https://grok.com/?q={query}',
    customInstructions: ''
  },
  {
    id: 'meta',
    name: 'Meta AI (Copy Prompt)',
    redirectionMethod: 'copy',
    urlTemplate: 'https://www.meta.ai/',
    customInstructions: ''
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Chat (Copy Prompt)',
    redirectionMethod: 'copy',
    urlTemplate: 'https://chat.deepseek.com/',
    customInstructions: ''
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi (Copy Prompt)',
    redirectionMethod: 'copy',
    urlTemplate: 'https://kimi.moonshot.cn/',
    customInstructions: ''
  },
  {
    id: 'longcat',
    name: 'LongCat AI (Copy Prompt)',
    redirectionMethod: 'copy',
    urlTemplate: 'https://longcat.chat/',
    customInstructions: ''
  }
];

