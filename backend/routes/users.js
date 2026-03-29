const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-change-in-production';

// 用户注册
router.post('/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const query = 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)';
    
    db.run(query, [username, passwordHash, role], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: '用户名已存在' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: '用户注册成功' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  
  db.get(query, [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });
});

// 获取当前用户信息
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
});

// 获取所有用户（仅管理员）
router.get('/', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const query = 'SELECT id, username, role, created_at FROM users';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (error) {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
});

// 更新用户角色（仅管理员）
router.put('/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const query = 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [role, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.json({ message: '用户角色更新成功' });
    });
  } catch (error) {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
});

// 修改密码
router.put('/password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }

  const token = authHeader.split(' ')[1];
  const { currentPassword, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const query = 'SELECT password_hash FROM users WHERE id = ?';
    
    db.get(query, [decoded.id], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: '当前密码错误' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      const updateQuery = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      db.run(updateQuery, [newHash, decoded.id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: '密码修改成功' });
      });
    });
  } catch (error) {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
});

module.exports = router;
