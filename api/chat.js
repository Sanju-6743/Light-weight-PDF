import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { message } = req.body
  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(message)
    const response = result.response.text()
    res.status(200).json({ response })
  } catch (error) {
    console.error('Gemini API error:', error)
    res.status(500).json({ error: 'Failed to get response' })
  }
}
