// This loads Express, a tool that lets us receive web requests
const express = require('express')
const app = express()

// This tells Express to automatically read JSON data from incoming requests
app.use(express.json())

// This is your webhook endpoint — the web address you give to Salt Edge
// Salt Edge will call this URL every time a new transaction appears
app.post('/webhook', (req, res) => {
  console.log('Raw data received:', JSON.stringify(req.body, null, 2))
  res.status(200).json({ status: 'received' })

  // req.body contains the transaction data Salt Edge sent
  const transaction = req.body.data

  console.log('New transaction received:')
  console.log('  Description:', transaction.description)
  console.log('  Amount:',      transaction.amount)
  console.log('  Category:',    transaction.category)
  console.log('  Date:',        transaction.made_on)

  // Tell Salt Edge "got it, thanks" — important, otherwise it retries
  res.status(200).json({ status: 'received' })
})

// A simple test route — visit this in your browser to check the server is alive
app.get('/health', (req, res) => {
  res.json({ status: 'running' })
})

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Budget backend is running on port 3000')
})