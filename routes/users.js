const express = require('express')
const router = express.Router()
const User = require('../models/user')
const Task = require('../models/task')

router.get('/', async (req, res) => {
  try {
    const list = await User.find()
    res.json({ message: 'ok', data: list })
  } catch (e) {
    res.status(500).json({ message: 'server error', data: null })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id)
    if (!u) return res.status(404).json({ message: 'not found', data: null })
    res.json({ message: 'ok', data: u })
  } catch (e) {
    if (e.name === 'CastError') {
      res.status(400).json({ message: 'invalid id', data: null })
    } else {
      res.status(500).json({ message: 'server error', data: null })
    }
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body
    if (!name || !email) return res.status(400).json({ message: 'missing fields', data: null })
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'duplicate', data: null })
    const u = await User.create(req.body)
    res.status(201).json({ message: 'ok', data: u })
  } catch (e) {
    res.status(500).json({ message: 'server error', data: null })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id)
    if (!u) return res.status(404).json({ message: 'not found', data: null })
    const { name, email, pendingTasks } = req.body
    if (!name || !email) return res.status(400).json({ message: 'missing fields', data: null })
    const old = u.pendingTasks
    u.name = name
    u.email = email
    u.pendingTasks = pendingTasks || []
    await u.save()
    for (const id of old) {
      if (!u.pendingTasks.includes(id)) {
        await Task.findByIdAndUpdate(id, { assignedUser: '', assignedUserName: 'unassigned' })
      }
    }
    for (const id of u.pendingTasks) {
      const t = await Task.findById(id)
      if (t && !t.completed) {
        t.assignedUser = u._id.toString()
        t.assignedUserName = u.name
        await t.save()
      }
    }
    res.json({ message: 'ok', data: u })
  } catch (e) {
    if (e.name === 'CastError') {
      res.status(400).json({ message: 'invalid id', data: null })
    } else {
      res.status(500).json({ message: 'server error', data: null })
    }
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id)
    if (!u) return res.status(404).json({ message: 'not found', data: null })
    await Task.updateMany(
      { assignedUser: u._id.toString(), completed: false },
      { assignedUser: '', assignedUserName: 'unassigned' }
    )
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: 'ok', data: null })
  } catch (e) {
    if (e.name === 'CastError') {
      res.status(400).json({ message: 'invalid id', data: null })
    } else {
      res.status(500).json({ message: 'server error', data: null })
    }
  }
})

module.exports = router
