const express = require('express')
const axios = require('axios')
const app = express()

app.use(express.json())

let transactions = []
let monthlyBudget = 3600

app.post('/webhook', async (req, res) => {
  console.log('Webhook received:', req.body.data.stage)
  if (req.body.data.stage === 'finish_fetching') {
    try {
      const response = await axios.get(
        'https://www.saltedge.com/api/v6/transactions',
        {
          headers: {
            'App-id': 'K6jQACaikG5tzfkwv2H76tluFXAl2Xja1U-9Se7HKno',
            'Secret': 'AOTJWIXd6MIsazBfja2xkYBDJvqBHOTOVtSSQRDBbIA',
          },
          params: { connection_id: '1806851670357841964' }
        }
      )
      transactions = response.data.data.map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        made_on: tx.made_on
      }))
      console.log('Transactions fetched:', transactions.length)
    } catch (error) {
      console.log('Error:', error.message)
    }
  }
  res.status(200).json({ status: 'received' })
})

// Get transactions
app.get('/transactions', (req, res) => {
  res.json(transactions)
})

// Get budget
app.get('/budget', (req, res) => {
  res.json({ monthlyBudget })
})

// Update budget
app.post('/budget', (req, res) => {
  const { budget } = req.body
  if (budget && budget > 0) {
    monthlyBudget = budget
    console.log('Budget updated to:', monthlyBudget)
    res.json({ monthlyBudget })
  } else {
    res.status(400).json({ error: 'Invalid budget' })
  }
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'running' })
})

app.listen(3000, () => {
  console.log('Budget backend running on port 3000')
})