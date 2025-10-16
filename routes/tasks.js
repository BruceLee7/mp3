const express = require('express')
const router = express.Router()
const Task = require('../models/task')
const User = require('../models/user')

router.get('/', async (req, res) => {
  try {
    const safe = s => {
      if (!s) return undefined
      try { return JSON.parse(s) } catch { return undefined }
    }

    const where = safe(req.query.where)
    const sort = safe(req.query.sort)
    const select = safe(req.query.select)
    const skip = req.query.skip ? parseInt(req.query.skip) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit) : 100
    const count = req.query.count === 'true'

    let q = Task.find(where || {})
    if (sort) q = q.sort(sort)
    if (select) q = q.select(select)
    if (skip) q = q.skip(skip)
    if (limit) q = q.limit(limit)

    if (count) {
      const c = await Task.countDocuments(where || {})
      return res.json({ message: 'ok', data: c })
    }

    const list = await q.exec()
    res.json({ message: 'ok', data: list })
  } catch {
    res.status(400).json({ message: 'err', data: null })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const t = await Task.findById(req.params.id)
    if (!t) return res.status(404).json({ message: 'not found', data: null })
    res.json({ message: 'ok', data: t })
  } catch {
    res.status(400).json({ message: 'err', data: null })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, deadline, assignedUser } = req.body
    if (!name || !deadline) return res.status(400).json({ message: 'missing fields', data: null })
    const t = await Task.create(req.body)
    if (assignedUser && !t.completed) {
      const u = await User.findById(assignedUser)
      if (u) {
        u.pendingTasks.push(t._id.toString())
        t.assignedUserName = u.name
        await u.save()
        await t.save()
      }
    }
    res.status(201).json({ message: 'ok', data: t })
  } catch {
    res.status(400).json({ message: 'err', data: null })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const t = await Task.findById(req.params.id)
    if (!t) return res.status(404).json({ message: 'not found', data: null })
    const oldUser = t.assignedUser
    const { name, deadline, completed, assignedUser } = req.body
    if (!name || !deadline) return res.status(400).json({ message: 'missing fields', data: null })
    Object.assign(t, req.body)
    await t.save()
    if (oldUser && oldUser !== assignedUser) {
      const oldU = await User.findById(oldUser)
      if (oldU) {
        oldU.pendingTasks = oldU.pendingTasks.filter(x => x !== t._id.toString())
        await oldU.save()
      }
    }
    if (assignedUser) {
      const newU = await User.findById(assignedUser)
      if (newU && !t.completed && !newU.pendingTasks.includes(t._id.toString())) {
        newU.pendingTasks.push(t._id.toString())
        t.assignedUserName = newU.name
        await newU.save()
        await t.save()
      }
    }
    if (t.completed && t.assignedUser) {
      const u = await User.findById(t.assignedUser)
      if (u) {
        u.pendingTasks = u.pendingTasks.filter(x => x !== t._id.toString())
        await u.save()
      }
    }
    res.json({ message: 'ok', data: t })
  } catch {
    res.status(400).json({ message: 'err', data: null })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const t = await Task.findById(req.params.id)
    if (!t) return res.status(404).json({ message: 'not found', data: null })
    if (t.assignedUser) {
      const u = await User.findById(t.assignedUser)
      if (u) {
        u.pendingTasks = u.pendingTasks.filter(x => x !== t._id.toString())
        await u.save()
      }
    }
    await Task.findByIdAndDelete(req.params.id)
    res.json({ message: 'ok', data: null })
  } catch {
    res.status(400).json({ message: 'err', data: null })
  }
})

module.exports = router
