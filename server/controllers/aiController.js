const { supabase } = require('../database/db');
const { GoogleGenAI } = require('@google/genai');
const { mapPoll } = require('../utils/mappers');

let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

exports.generatePoll = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (!ai) return res.status(500).json({ error: 'Gemini AI is not configured. Please add GEMINI_API_KEY to server/.env' });
  
  try {
    const { topic, classroomId } = req.body;
    if (!topic || !classroomId) return res.status(400).json({ error: 'Missing topic or classroomId' });

    const prompt = `Generate a multiple choice classroom poll question with 2 to 4 options on the topic: "${topic}". The response must be valid JSON matching this schema: {"question": "string", "options": ["string", "string"]}. Return only the JSON object, without any markdown formatting or backticks.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    // Create the poll
    const pollId = `POLL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const { data: newPoll, error } = await supabase
      .from('polls')
      .insert([{
        id: pollId,
        staff_id: req.user.id,
        classroom_id: classroomId,
        question: parsed.question,
        options: parsed.options,
        status: 'live',
        item_type: 'poll',
        excluded_student_ids: []
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.json(mapPoll(newPoll));
  } catch (error) {
    console.error('AI Generate Error:', error);
    res.status(500).json({ error: 'Failed to generate AI poll. Ensure response is valid JSON.' });
  }
};

exports.generateSummary = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (!ai) return res.status(500).json({ error: 'Gemini AI is not configured. Please add GEMINI_API_KEY to server/.env' });
  
  try {
    const { pollQuestion, options, results } = req.body;
    const prompt = `Analyze the following classroom poll results. The question was "${pollQuestion}". Options were ${options.join(', ')}. The results are: ${JSON.stringify(results)}. Provide a very brief (2-3 sentences) actionable summary for the teacher regarding student performance or engagement.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    res.json({ summary: response.text });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to generate AI summary' });
  }
};
