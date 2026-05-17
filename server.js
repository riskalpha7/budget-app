const express = require('express')
const app = express()

app.use(express.json())

// In-memory store for transactions
let transactions = []

// Salt Edge calls this when new transactions appear
app.post('/webhook', async (req, res) => {
  console.log('Webhook received:', req.body.data.stage)

  if (req.body.data.stage === 'finish_fetching') {
    const axios = require('axios')
    
    try {
      const response = await axios.get(
        'https://www.saltedge.com/api/v6/transactions',
        {
          headers: {
            'App-id': 'K6jQACaikG5tzfkwv2H76tluFXAl2Xja1U-9Se7HKno',
            'Secret': 'AOTJWIXd6MIsazBfja2xkYBDJvqBHOTOVtSSQRDBbIA',
          },
          params: {
            connection_id: '1806851670357841964'
          }
        }
      )

      const fetched = response.data.data
      console.log('Transactions fetched:', fetched.length)

      // Store them
      transactions = fetched.map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        made_on: tx.made_on
      }))

    } catch (error) {
      console.log('Error fetching transactions:', error.message)
    }
  }

  res.status(200).json({ status: 'received' })
})

// Your iPhone app calls this to get transactions
app.get('/transactions', (req, res) => {
  res.json(transactions)
})

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'running' })
})

app.listen(3000, () => {
  console.log('Budget backend is running on port 3000')
})