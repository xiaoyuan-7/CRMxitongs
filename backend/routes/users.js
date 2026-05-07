const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const bcrypt = require('bcryptjs');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const db = getDatabase();
    
    // 检查用户名是否已存在
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 创建用户
    const result = await db.run(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
    `, [username, passwordHash, role || 'user']);
    
    res.json({ id: result.lastID, message: '用户注册成功' });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({ error: '用户注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const db = getDatabase();
    
    // 查找用户
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 简单的token生成（实际应用中应该使用JWT）
    const token = Buffer.from(`${user.id}:${user.username}:${user.role}`).toString('base64');
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      token: token,
      message: '登录成功'
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ error: '用户登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    // 在实际应用中，应该从token中解析用户ID
    const userId = 1; // 简化处理，使用默认用户
    
    const db = getDatabase();
    const user = await db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取所有用户（管理员功能）
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const users = await db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 更新用户角色（管理员功能）
router.put('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    const db = getDatabase();
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    
    res.json({ message: '用户角色更新成功' });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    res.status(500).json({ error: '更新用户角色失败' });
  }
});

// 修改密码
router.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '原密码和新密码不能为空' });
    }
    
    // 在实际应用中，应该从token中解析用户ID
    const userId = 1; // 简化处理，使用默认用户
    
    const db = getDatabase();
    
    // 获取用户信息
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 验证原密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '原密码错误' });
    }
    
    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
    
    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;