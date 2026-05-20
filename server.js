const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const app = express()

app.use(express.json())

// File paths for persistent storage
const DATA_DIR = '/opt/render/project/data'
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json')
const BUDGET_FILE = path.join(DATA_DIR, 'budget.json')

// Make sure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// Load transactions from disk
function loadTransactions() {
  try {
    ensureDataDir()
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.log('Error loading transactions:', err.message)
  }
  return []
}

// Save transactions to disk
function saveTransactions(transactions) {
  try {
    ensureDataDir()
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2))
  } catch (err) {
    console.log('Error saving transactions:', err.message)
  }
}

// Load budget from disk
function loadBudget() {
  try {
    ensureDataDir()
    if (fs.existsSync(BUDGET_FILE)) {
      const data = fs.readFileSync(BUDGET_FILE, 'utf8')
      return JSON.parse(data).monthlyBudget || 3600
    }
  } catch (err) {
    console.log('Error loading budget:', err.message)
  }
  return 3600
}

// Save budget to disk
function saveBudget(budget) {
  try {
    ensureDataDir()
    fs.writeFileSync(BUDGET_FILE, JSON.stringify({ monthlyBudget: budget }, null, 2))
  } catch (err) {
    console.log('Error saving budget:', err.message)
  }
}

// Load data on startup
let transactions = loadTransactions()
let monthlyBudget = loadBudget()
console.log(`Loaded ${transactions.length} transactions, budget CHF ${monthlyBudget}`)

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
      const saltEdgeTransactions = response.data.data.map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        made_on: tx.made_on
      }))

      // Merge with existing UBS manual transactions
      const manualTransactions = transactions.filter(tx => tx.id.startsWith('ubs_'))
      transactions = [...saltEdgeTransactions, ...manualTransactions]
      saveTransactions(transactions)
      console.log('Transactions updated:', transactions.length)
    } catch (error) {
      console.log('Error:', error.message)
    }
  }
  res.status(200).json({ status: 'received' })
})

// Manual transaction from Make.com Gmail automation
app.post('/add-transaction', (req, res) => {
  console.log('Received body:', JSON.stringify(req.body))

  const { amount, description, account } = req.body

  let parsedAmount = null

  if (typeof amount === 'string' && amount.includes('debited CHF')) {
    const match = amount.match(/debited CHF ([\d.]+)/)
    if (match) {
      parsedAmount = parseFloat(match[1])
    }
  } else if (typeof amount === 'string') {
    parsedAmount = parseFloat(amount)
  } else if (typeof amount === 'number') {
    parsedAmount = amount
  }

  if (!parsedAmount || isNaN(parsedAmount)) {
    console.log('Could not parse amount from:', amount)
    return res.status(200).json({ error: 'Could not parse amount', received: amount })
  }

  const today = new Date()
  const made_on = today.toISOString().split('T')[0]

  // Check for duplicate — same amount same day
  const duplicate = transactions.find(tx =>
    tx.made_on === made_on &&
    Math.abs(tx.amount) === parsedAmount &&
    tx.id.startsWith('ubs_')
  )

  if (duplicate) {
    console.log('Duplicate transaction ignored')
    return res.status(200).json({ status: 'duplicate', transaction: duplicate })
  }

  const transaction = {
    id: 'ubs_' + Date.now(),
    description: description || 'UBS Transaction',
    amount: -Math.abs(parsedAmount),
    category: null,
    made_on: made_on
  }

  transactions.unshift(transaction)
  saveTransactions(transactions)
  console.log('UBS transaction added and saved:', transaction)
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
    saveBudget(budget)
    console.log('Budget updated and saved:', monthlyBudget)
    res.json({ monthlyBudget })
  } else {
    res.status(400).json({ error: 'Invalid budget' })
  }
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'running', transactions: transactions.length, budget: monthlyBudget })
})

app.listen(3000, () => {
  console.log('Budget backend running on port 3000')
})