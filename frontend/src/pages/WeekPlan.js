import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, DatePicker, Select, message, InputNumber, Popconfirm } from 'antd';
import { PlusOutlined, CalendarOutlined, CheckOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const WeekPlan = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form] = Form.useForm();
  const [currentWeekStart, setCurrentWeekStart] = useState('');

  useEffect(() => {
    const weekStart = getWeekStart(new Date());
    setCurrentWeekStart(weekStart);
    loadTasks(weekStart);
  }, []);

  // 获取当前周的周一日期
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const loadTasks = async (weekStart) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/week-tasks?week_start=${weekStart}`);
      setTasks(response.data);
    } catch (error) {
      message.error('加载周计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ 
      week_start: currentWeekStart,
      plan_date: dayjs(),
      priority: 'medium',
      time_period: 'am'
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTask(record);
    form.setFieldsValue({
      ...record,
      plan_date: dayjs(record.plan_date)
    });
    setIsModalVisible(true);
  };

  const handleComplete = async (id) => {
    try {
      await axios.put(`/api/week-tasks/${id}`, { status: 'completed' });
      message.success('已标记为完成');
      loadTasks(currentWeekStart);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/week-tasks/${id}`);
      message.success('删除成功');
      loadTasks(currentWeekStart);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        plan_date: values.plan_date.format('YYYY-MM-DD')
      };
      if (editingTask) {
        await axios.put(`/api/week-tasks/${editingTask.id}`, { 
          ...data, 
          status: editingTask.status 
        });
        message.success('更新成功');
      } else {
        await axios.post('/api/week-tasks', data);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      loadTasks(currentWeekStart);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '计划日期',
      dataIndex: 'plan_date',
      key: 'plan_date',
      width: 120,
      render: (date) => {
        const isToday = dayjs(date).isSame(dayjs(), 'day');
        const isOverdue = dayjs(date).isBefore(dayjs(), 'day');
        return (
          <span style={{ 
            color: isToday ? '#1890ff' : isOverdue ? '#ff4d4f' : 'inherit',
            fontWeight: isToday ? 'bold' : 'normal'
          }}>
            {dayjs(date).format('MM-DD')}
            {isToday && ' (今天)'}
            {isOverdue && ' (逾期)'}
          </span>
        );
      }
    },
    {
      title: '时段',
      dataIndex: 'time_period',
      key: 'time_period',
      width: 80,
      render: (period) => period === 'am' ? '上午' : '下午'
    },
    {
      title: '企业',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 200,
      ellipsis: true
    },
    {
      title: '待办事项',
      dataIndex: 'action',
      key: 'action',
      ellipsis: true
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => {
        const colors = { high: 'red', medium: 'orange', low: 'green' };
        const labels = { high: '高', medium: '中', low: '低' };
        return <Tag color={colors[priority]}>{labels[priority]}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colors = { pending: 'processing', completed: 'success' };
        const labels = { pending: '待处理', completed: '已完成' };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button 
              type="link" 
              icon={<CheckOutlined />} 
              onClick={() => handleComplete(record.id)}
            >
              完成
            </Button>
          )}
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 统计
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => t.status === 'pending' && dayjs(t.plan_date).isBefore(dayjs(), 'day')).length;

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <CalendarOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 500 }}>周计划</span>
            <span style={{ marginLeft: 16, color: '#666' }}>
              本周：{currentWeekStart}
            </span>
          </div>
          <Space>
            <Tag color="processing">待处理：{pendingCount}</Tag>
            <Tag color="success">已完成：{completedCount}</Tag>
            {overdueCount > 0 && <Tag color="error">逾期：{overdueCount}</Tag>}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加待办
            </Button>
          </Space>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: '本周暂无待办事项' }}
      />

      <Modal
        title={editingTask ? '编辑待办' : '添加待办'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="week_start" label="周起始日期" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="plan_date" label="计划日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="time_period" label="时段" initialValue="am">
            <Select>
              <Option value="am">上午</Option>
              <Option value="pm">下午</Option>
            </Select>
          </Form.Item>
          <Form.Item name="company_name" label="企业名称" rules={[{ required: true }]}>
            <Input placeholder="输入企业名称" />
          </Form.Item>
          <Form.Item name="company_id" label="企业 ID" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="action" label="待办事项" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="例如：拜访关键人、发送产品资料、跟进薪福通等" />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="medium">
            <Select>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WeekPlan;
