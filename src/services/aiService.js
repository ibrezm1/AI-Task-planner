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
        currentDate = new Date().toISOString().split('T')[0]
    }) => {
        if (!apiKey) {
            throw new Error(`API Key for ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} is missing. Please configure it in Settings.`);
        }
        const cleanKey = apiKey.trim();

        const systemInstructions = `You are a professional personal development coach and tutor.
Your task is to break down the user's recurring learning goal into a highly structured, concrete set of 3 to 6 tasks for the upcoming week.

The recurring goal is:
- Title: "${goal.title}"
- Description: "${goal.description}"
${goal.category ? `- Category: "${goal.category}"` : ''}

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
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;

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

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            const url = 'https://openrouter.ai/api/v1/chat/completions';

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
        chatHistory = []
    }) => {
        if (!apiKey) {
            throw new Error(`API Key for ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} is missing. Please configure it in Settings.`);
        }
        const cleanKey = apiKey.trim();

        const systemInstructions = `You are a personal learning coach and expert tutor.
The user is working on their recurring goal: "${goal.title}" (${goal.description || 'No description'}).
Answer questions, clarify concepts, suggest resources, and help them plan their studies.
Feel free to format mathematical equations in standard LaTeX notation using single dollars for inline math (e.g. $E=mc^2$) and double dollars for block math (e.g. $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$).
Provide detailed, structured responses formatted in Markdown.`;

        if (provider === 'gemini') {
            const geminiModel = model || 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;

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

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            const url = 'https://openrouter.ai/api/v1/chat/completions';

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
        task
    }) => {
        if (!apiKey) {
            throw new Error(`API Key for ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} is missing. Please configure it in Settings.`);
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
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cleanKey}`;

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

        } else {
            const openRouterModel = model || 'meta-llama/llama-3-8b-instruct:free';
            const url = 'https://openrouter.ai/api/v1/chat/completions';

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
    }
};
