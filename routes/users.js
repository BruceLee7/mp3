const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Task = require("../models/task");

function parseQuery(req) {
  const safeJSON = (s) => {
    if (!s) return undefined;
    try { return JSON.parse(s); } catch { return undefined; }
  };
  const where  = safeJSON(req.query.where);
  const sort   = safeJSON(req.query.sort);
  const select = safeJSON(req.query.select);
  const skip   = req.query.skip ? parseInt(req.query.skip, 10) : undefined;
  let limit    = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const count  = req.query.count === "true";
  return { where, sort, select, skip, limit, count };
}

router.get("/users", async (req, res) => {
  try {
    const { where, sort, select, skip, limit, count } = parseQuery(req);
    if (count) {
      const c = await User.countDocuments(where || {});
      return res.status(200).json({ message: "OK", data: c });
    }
    let q = User.find(where || {});
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

router.get("/users/:id", async (req, res) => {
  try {
    const { select } = parseQuery(req);
    const doc = await User.findById(req.params.id, select || undefined);
    if (!doc) return res.status(404).json({ message: "User not found", data: null });
    res.status(200).json({ message: "OK", data: doc });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Missing name or email", data: null });

    const exist = await User.findOne({ email });
    if (exist)
      return res.status(400).json({ message: "Email already exists", data: null });

    const user = await User.create(req.body);
    res.status(201).json({ message: "User created", data: user });
  } catch {
    res.status(500).json({ message: "Server error", data: null });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found", data: null });

    const { name, email, pendingTasks } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Missing name or email", data: null });

    const oldTasks = user.pendingTasks || [];
    user.name = name;
    user.email = email;
    user.pendingTasks = pendingTasks || [];
    await user.save();

    for (const tid of oldTasks) {
      if (!user.pendingTasks.includes(tid)) {
        await Task.findByIdAndUpdate(tid, {
          assignedUser: "",
          assignedUserName: "unassigned",
        });
      }
    }
    for (const tid of user.pendingTasks) {
      const t = await Task.findById(tid);
      if (t && !t.completed) {
        t.assignedUser = user._id.toString();
        t.assignedUserName = user.name;
        await t.save();
      }
    }
    res.status(200).json({ message: "User updated", data: user });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found", data: null });

    await Task.updateMany(
      { assignedUser: user._id.toString(), completed: false },
      { assignedUser: "", assignedUserName: "unassigned" }
    );
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted", data: null });
  } catch {
    res.status(400).json({ message: "Bad request", data: null });
  }
});

module.exports = function (router) {
    router.get('/', async (req, res) => {
      try {
        const users = await User.find();
        res.json({ message: "OK", data: users });
      } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
      }
    });
  
    return router;
  };