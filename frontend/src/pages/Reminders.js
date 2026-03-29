import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, DatePicker, Select, message, Tabs } from 'antd';
import { PlusOutlined, CheckOutlined, DeleteOutlined, BellOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const [allRes, todayRes, upcomingRes] = await Promise.all([
        axios.get('/api/reminders?is_completed=false'),
        axios.get('/api/reminders/today'),
        axios.get('/api/reminders/upcoming?days=7')
      ]);
      setReminders(allRes.data);
      setTodayReminders(todayRes.data);
      setUpcomingReminders(upcomingRes.data);
    } catch (error) {
      message.error('加载提醒失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleComplete = async (id) => {
    try {
      await axios.put(`/api/reminders/${id}/complete`);
      message.success('已标记为完成');
      loadReminders();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/reminders/${id}`);
      message.success('删除成功');
      loadReminders();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        reminder_date: values.reminder_date.format('YYYY-MM-DD')
      };
      await axios.post('/api/reminders', data);
      message.success('提醒创建成功');
      setIsModalVisible(false);
      loadReminders();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleGenerateBirthdayReminders = async () => {
    try {
      await axios.post('/api/reminders/generate-birthday-reminders', {
        year: new Date().getFullYear()
      });
      message.success('生日提醒生成成功');
      loadReminders();
    } catch (error) {
      message.error('生成失败');
    }
  };

  const handleGenerateGiftReminders = async () => {
    try {
      await axios.post('/api/reminders/generate-gift-reminders', {
        year: new Date().getFullYear()
      });
      message.success('节假日送礼提醒生成成功');
      loadReminders();
    } catch (error) {
      message.error('生成失败');
    }
  };

  const columns = [
    {
      title: '提醒日期',
      dataIndex: 'reminder_date',
      key: 'reminder_date',
      render: (date) => {
        const isToday = dayjs(date).isSame(dayjs(), 'day');
        const isOverdue = dayjs(date).isBefore(dayjs(), 'day');
        return (
          <span style={{ 
            color: isToday ? '#1890ff' : isOverdue ? '#ff4d4f' : 'inherit',
            fontWeight: isToday ? 'bold' : 'normal'
          }}>
            {dayjs(date).format('YYYY-MM-DD')}
            {isToday && ' (今天)'}
          </span>
        );
      },
      sorter: (a, b) => dayjs(a.reminder_date).valueOf() - dayjs(b.reminder_date).valueOf()
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <span>
          {record.reminder_type === '生日' && '🎂 '}
          {record.reminder_type === '节假日送礼' && '🎁 '}
          {text}
        </span>
      )
    },
    {
      title: '类型',
      dataIndex: 'reminder_type',
      key: 'reminder_type',
      render: (type) => {
        const colors = {
          '生日': 'pink',
          '节假日送礼': 'gold',
          '跟进': 'blue',
          '其他': 'default'
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      }
    },
    {
      title: '关键人',
      dataIndex: 'contact_name',
      key: 'contact_name',
      render: (text) => text || '-'
    },
    {
      title: '企业',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (text) => text || '-'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<CheckOutlined />} 
            onClick={() => handleComplete(record.id)}
          >
            完成
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <BellOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 500 }}>提醒中心</span>
          </div>
          <Space>
            <Button onClick={handleGenerateBirthdayReminders}>
              🎂 生成本年生日提醒
            </Button>
            <Button onClick={handleGenerateGiftReminders}>
              🎁 生成节假日送礼提醒
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              手动添加提醒
            </Button>
          </Space>
        </div>
      </Card>

      <Tabs defaultActiveKey="today">
        <TabPane tab={`今日提醒 (${todayReminders.length})`} key="today">
          <Table
            columns={columns}
            dataSource={todayReminders}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: '今日暂无提醒' }}
          />
        </TabPane>
        <TabPane tab={`即将到期 (${upcomingReminders.length})`} key="upcoming">
          <Table
            columns={columns}
            dataSource={upcomingReminders}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: '暂无即将到期的提醒' }}
          />
        </TabPane>
        <TabPane tab={`全部提醒 (${reminders.length})`} key="all">
          <Table
            columns={columns}
            dataSource={reminders}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暂无提醒' }}
          />
        </TabPane>
      </Tabs>

      <Modal
        title="添加提醒"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="reminder_type" label="提醒类型" rules={[{ required: true }]}>
            <Select>
              <Option value="生日">生日</Option>
              <Option value="节假日送礼">节假日送礼</Option>
              <Option value="跟进">跟进</Option>
              <Option value="会议">会议</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="reminder_date" label="提醒日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reminders;
