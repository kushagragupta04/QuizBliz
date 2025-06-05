const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateQuestions(topic) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    const prompt = `Generate 10 multiple choice questions about ${topic}. 
    Return ONLY a JSON array with this exact format for each question:
    {
        "question": "question text",
        "options": ["option1", "option2", "option3", "option4"],
        "correct_answer": "correct option"
    }
    The response should be a valid JSON array starting with [ and ending with ]. No other text or formatting.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean up the response text
        text = text.replace(/```json\n?/g, '')
                  .replace(/```\n?/g, '')
                  .replace(/^\s*/, '')  // Remove leading whitespace
                  .replace(/\s*$/, '')  // Remove trailing whitespace
                  .trim();
        
        // Ensure the text starts with [ and ends with ]
        if (!text.startsWith('[') || !text.endsWith(']')) {
            throw new Error('Invalid response format: Response must be a JSON array');
        }
        
        // Validate JSON before returning
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
            throw new Error('Invalid response format: Not an array');
        }
        
        // Validate each question object
        parsed.forEach((question, index) => {
            if (!question.question || !Array.isArray(question.options) || !question.correct_answer) {
                throw new Error(`Invalid question format at index ${index}`);
            }
        });
        
        return parsed;
    } catch (error) {
        console.error('Error generating questions:', error);
        throw new Error(`Failed to generate valid quiz questions: ${error.message}`);
    }
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const questions = await generateQuestions(topic);
        res.status(200).json(questions);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate questions'
        });
    }
} 