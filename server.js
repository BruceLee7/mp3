const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()
app.use(bodyParser.json())

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('db connected')).catch(err => console.log('db error', err))

require('./routes')(app)

app.get('/', (req, res) => {
  res.json({ message: 'ok', data: null })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`running on ${port}`))
