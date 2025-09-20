import axios from 'axios'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { image } = req.body
  if (!image) {
    return res.status(400).json({ error: 'Image is required' })
  }

  try {
    const response = await axios.post('https://api.optic.com/ocr', {
      image: image,
      key: 'Djk1T7uDxootW1Z2DTwWJgjRAkQUR7EEeCY8tXruz46U'
    })
    res.status(200).json({ text: response.data.text })
  } catch (error) {
    console.error('OCR API error:', error)
    res.status(500).json({ error: 'Failed to perform OCR' })
  }
}
