require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const port = process.env.PORT || 3000;

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate quiz questions using Gemini AI
async function generateQuestions(topic) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Generate 10 multiple choice questions about ${topic}. 
    Return ONLY a JSON array with this exact format for each question:
    {
        "question": "question text",
        "options": ["option1", "option2", "option3", "option4"],
        "correct_answer": "correct option"
    }`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Remove any Markdown code block formatting
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        return JSON.parse(text);
    } catch (error) {
        console.error('Error generating questions:', error);
        throw error;
    }
}

// API endpoint to get quiz questions
app.post('/api/quiz', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const questions = await generateQuestions(topic);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 