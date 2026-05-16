const express = require('express')
const app = express()

app.use(express.json())

app.post('/webhook', (req, res) => {
  console.log('Raw data received:')
  console.log(JSON.stringify(req.body, null, 2))
  res.status(200).json({ status: 'received' })
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'running' })
})

app.listen(3000, () => {
  console.log('Budget backend is running on port 3000')
})