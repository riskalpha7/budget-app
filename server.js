const express = require('express')
const axios = require('axios')
const app = express()

app.use(express.json())

const APP_ID = 'K6jQACaikG5tzfkwv2H76tluFXAl2Xja1U-9Se7HKno'
const SECRET = 'AOTJWIXd6MIsazBfja2xkYBDJvqBHOTOVtSSQRDBbIA'
const CONNECTION_ID = '1806851670357841964'

app.post('/webhook', async (req, res) => {
  console.log('Webhook received:', req.body.data.stage)

  if (req.body.data.stage === 'finish_fetching') {
    try {
      const response = await axios.get(
        'https://www.saltedge.com/api/v6/transactions',
        {
          headers: {
            'App-id': APP_ID,
            'Secret': SECRET,
          },
          params: {
            connection_id: CONNECTION_ID
          }
        }
      )

      const transactions = response.data.data
      console.log('Transactions fetched:', transactions.length)
      transactions.forEach(tx => {
        console.log(`  ${tx.made_on} | ${tx.description} | ${tx.amount} ${tx.currency_code}`)
      })

    } catch (error) {
      console.log('Error fetching transactions:', error.message)
    }
  }

  res.status(200).json({ status: 'received' })
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'running' })
})

app.listen(3000, () => {
  console.log('Budget backend is running on port 3000')
})