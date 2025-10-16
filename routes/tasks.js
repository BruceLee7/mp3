const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const User = require("../models/user");

function parseQuery(req) {
  const safeJSON = (s) => {
    if (!s) return undefined;
    try { return JSON.parse(s); } catch { return undefined; }
  };
  const where  = safeJSON(req.query.where);
  const sort   = safeJSON(req.query.sort);
  const select = safeJSON(req.query.select);
  const skip   = req.query.skip ? parseInt(req.query.skip, 10) : undefined;
  let limit    = req.query.limit ? parseInt(req.query.limit, 10) : 100;
  const count  = req.query.count === "true";
  return { where, sort, select, skip, limit, count };
}

router.get("/tasks", async (req, res) => {
  try {
    const { where, sort, select, skip, limit, count } = parseQuery(req);
    if (count) {
      const c = await Task.countDocuments(where || {});
      return res.status(200).json({ message: "OK", data: c });
    }
    let q = Task.find(where || {});
    if (sort) q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip) q = q.skip(skip);
    if (limit) q = q.limit(limit);
    const rows = await q.exec();
    res.status(200).json({ message: "OK", data: rows });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const { select } = parseQuery(req);
    const t = await Task.findById(req.params.id, select || undefined);
    if (!t) return res.status(404).json({ message: "Task not found", data: null });
    res.status(200).json({ message: "OK", data: t });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const { name, deadline, assignedUser } = req.body;
    if (!name || !deadline)
      return res.status(400).json({ message: "Missing name or deadline", data: null });

    const t = await Task.create(req.body);
    if (assignedUser && !t.completed) {
      const u = await User.findById(assignedUser);
      if (u) {
        u.pendingTasks.push(t._id.toString());
        await u.save();
        t.assignedUserName = u.name;
        await t.save();
      }
    }
    res.status(201).json({ message: "Task created", data: t });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});


router.put("/tasks/:id", async (req, res) => {
  try {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "Task not found", data: null });

    const oldUser = t.assignedUser;
    const { name, deadline, completed, assignedUser } = req.body;
    if (!name || !deadline)
      return res.status(400).json({ message: "Missing name or deadline", data: null });

    Object.assign(t, req.body);
    await t.save();

    if (oldUser && oldUser !== assignedUser) {
      const oldU = await User.findById(oldUser);
      if (oldU) {
        oldU.pendingTasks = oldU.pendingTasks.filter(x => x !== t._id.toString());
        await oldU.save();
      }
    }
    // 添加到新用户
    if (assignedUser) {
      const newU = await User.findById(assignedUser);
      if (newU && !t.completed && !newU.pendingTasks.includes(t._id.toString())) {
        newU.pendingTasks.push(t._id.toString());
        t.assignedUserName = newU.name;
        await newU.save();
        await t.save();
      }
    }
    if (t.completed && t.assignedUser) {
      const u = await User.findById(t.assignedUser);
      if (u) {
        u.pendingTasks = u.pendingTasks.filter(x => x !== t._id.toString());
        await u.save();
      }
    }

    res.status(200).json({ message: "Task updated", data: t });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});


router.delete("/tasks/:id", async (req, res) => {
  try {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "Task not found", data: null });

    if (t.assignedUser) {
      const u = await User.findById(t.assignedUser);
      if (u) {
        u.pendingTasks = u.pendingTasks.filter(x => x !== t._id.toString());
        await u.save();
      }
    }
    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted", data: null });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});

module.exports = function (router) {
    router.get('/', async (req, res) => {
      try {
        const tasks = await Task.find();
        res.json({ message: "OK", data: tasks });
      } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
      }
    });
  
    return router;
  };