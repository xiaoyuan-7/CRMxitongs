import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const Settings = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get('/api/companies')
      ]);
      setUsers(usersRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    form.resetFields();
    setIsUserModalVisible(true);
  };

  const handleRegisterUser = async () => {
    try {
      const values = await form.validateFields();
      await axios.post('/api/users/register', values);
      message.success('用户创建成功');
      setIsUserModalVisible(false);
      loadData();
    } catch (error) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await axios.put(`/api/users/${userId}/role`, { role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('角色更新成功');
      loadData();
    } catch (error) {
      message.error(error.response?.data?.error || '更新失败');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/companies', { responseType: 'blob' });
      const data = companies.map(c => ({
        企业名称：c.name,
        行业：c.industry,
        关键人：c.contact_names,
        是否开户：c.is_account_opened ? '是' : '否',
        是否代发：c.is_payroll_service ? '是' : '否',
        有效户：c.is_active_customer ? '是' : '否',
        高质量：c.is_high_quality ? '是' : '否',
        进度状态：c.progress_status,
        跟进次数：c.follow_up_count
      }));

      // 生成 CSV
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `企业数据导出_${new Date().toLocaleDateString()}.csv`;
      link.click();
      
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => (
        <Select
          value={role}
          onChange={(value) => handleUpdateRole(record.id, value)}
          style={{ width: 120 }}
          disabled={!token}
        >
          <Option value="user">普通用户</Option>
          <Option value="admin">管理员</Option>
        </Select>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleString() : '-'
    }
  ];

  const companyColumns = [
    {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry'
    },
    {
      title: '进度状态',
      dataIndex: 'progress_status',
      key: 'progress_status'
    },
    {
      title: '是否开户',
      dataIndex: 'is_account_opened',
      key: 'is_account_opened',
      render: (value) => value ? '是' : '否'
    },
    {
      title: '是否代发',
      dataIndex: 'is_payroll_service',
      key: 'is_payroll_service',
      render: (value) => value ? '是' : '否'
    }
  ];

  return (
    <div>
      <Card title="用户权限管理" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#666' }}>管理系统用户和权限。只有管理员可以修改用户角色。</p>
            {!token && <p style={{ color: '#ff4d4f' }}>⚠️ 当前未登录，无法修改用户角色</p>}
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
            添加用户
          </Button>
        </div>
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无用户数据' }}
        />
      </Card>

      <Card title="数据导出">
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#666' }}>导出企业数据为 CSV 格式，可用于 Excel 编辑和备份。</p>
        </div>
        <Space>
          <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
            导出企业数据 (CSV)
          </Button>
          <Button onClick={() => window.print()}>
            打印页面
          </Button>
        </Space>
      </Card>

      <Card title="系统信息" style={{ marginTop: 16 }}>
        <div style={{ lineHeight: 2 }}>
          <p><strong>系统名称：</strong>客户管理系统 CRM</p>
          <p><strong>版本：</strong>1.0.0</p>
          <p><strong>技术栈：</strong>React + Node.js + SQLite</p>
          <p><strong>企业总数：</strong>{companies.length}</p>
          <p><strong>数据更新时间：</strong>{new Date().toLocaleString()}</p>
        </div>
      </Card>

      <Modal
        title="添加用户"
        open={isUserModalVisible}
        onOk={handleRegisterUser}
        onCancel={() => setIsUserModalVisible(false)}
        width={400}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="user">
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
