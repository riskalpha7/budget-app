const express = require('express')
const axios = require('axios')
const app = express()

app.use(express.json())

let transactions = []
let monthlyBudget = 3600

// Salt Edge webhook
app.post('/webhook', async (req, res) => {
  console.log('Webhook received:', req.body.data.stage)
  if (req.body.data.stage === 'finish_fetching') {
    try {
      const response = await axios.get(
        'https://www.saltedge.com/api/v6/transactions',
        {
          headers: {
            'App-id': 'YOUR_APP_ID_HERE',
            'Secret': 'YOUR_SECRET_HERE',
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

// Manual transaction from Make.com Gmail automation
app.post('/add-transaction', (req, res) => {
  const { amount, description, account } = req.body

  let parsedAmount = null

  // If amount is a raw email snippet, extract the CHF amount
  if (typeof amount === 'string' && amount.includes('debited CHF')) {
    const match = amount.match(/debited CHF ([\d.]+)/)
    if (match) {
      parsedAmount = parseFloat(match[1])
    }
  } else {
    parsedAmount = parseFloat(amount)
  }

  if (!parsedAmount || isNaN(parsedAmount)) {
    console.log('Could not parse amount from:', amount)
    return res.status(400).json({ error: 'Could not parse amount' })
  }

  const today = new Date()
  const made_on = today.toISOString().split('T')[0]

  const transaction = {
    id: 'ubs_' + Date.now(),
    description: description || 'UBS Transaction',
    amount: -Math.abs(parsedAmount),
    category: null,
    made_on: made_on
  }

  transactions.unshift(transaction)
  console.log('UBS transaction added:', transaction)
  res.status(200).json({ status: 'added', transaction })
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