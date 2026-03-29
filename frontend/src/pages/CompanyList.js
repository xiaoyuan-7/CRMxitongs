import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Modal, Form, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const CompanyList = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();

  const progressStatusOptions = ['初步接触', '需求分析', '方案报价', '谈判中', '已签约', '已流失'];

  useEffect(() => {
    loadCompanies();
  }, [filters]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/companies?${params.toString()}`);
      setCompanies(response.data);
    } catch (error) {
      message.error('加载企业列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadCompanies();
  };

  const handleAdd = () => {
    setEditingCompany(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCompany(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/companies/${id}`);
      message.success('删除成功');
      loadCompanies();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCompany) {
        await axios.put(`/api/companies/${editingCompany.id}`, values);
        message.success('更新成功');
      } else {
        await axios.post('/api/companies', values);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      loadCompanies();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      render: (text, record) => (
        <a onClick={() => navigate(`/companies/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '关键人',
      dataIndex: 'contact_names',
      key: 'contact_names',
      width: 150,
      ellipsis: true
    },
    {
      title: '是否开户',
      dataIndex: 'is_account_opened',
      key: 'is_account_opened',
      width: 80,
      render: (value) => (
        <Tag color={value ? 'green' : 'red'}>{value ? '是' : '否'}</Tag>
      ),
      filters: [
        { text: '是', value: 'true' },
        { text: '否', value: 'false' }
      ],
      onFilter: (value, record) => record.is_account_opened.toString() === value
    },
    {
      title: '是否代发',
      dataIndex: 'is_payroll_service',
      key: 'is_payroll_service',
      width: 80,
      render: (value) => (
        <Tag color={value ? 'blue' : 'default'}>{value ? '是' : '否'}</Tag>
      ),
      filters: [
        { text: '是', value: 'true' },
        { text: '否', value: 'false' }
      ],
      onFilter: (value, record) => record.is_payroll_service.toString() === value
    },
    {
      title: '有效户',
      dataIndex: 'is_active_customer',
      key: 'is_active_customer',
      width: 80,
      render: (value) => (
        <Tag color={value ? 'green' : 'default'}>{value ? '是' : '否'}</Tag>
      )
    },
    {
      title: '高质量',
      dataIndex: 'is_high_quality',
      key: 'is_high_quality',
      width: 80,
      render: (value) => (
        <Tag color={value ? 'gold' : 'default'}>{value ? '是' : '否'}</Tag>
      )
    },
    {
      title: '进度状态',
      dataIndex: 'progress_status',
      key: 'progress_status',
      width: 100,
      render: (value) => <Tag color="processing">{value}</Tag>,
      filters: progressStatusOptions.map(status => ({ text: status, value: status })),
      onFilter: (value, record) => record.progress_status === value
    },
    {
      title: '跟进次数',
      dataIndex: 'follow_up_count',
      key: 'follow_up_count',
      width: 80,
      sorter: (a, b) => a.follow_up_count - b.follow_up_count
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/companies/${record.id}`)}>
            详情
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="搜索企业名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="进度状态"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => setFilters({ ...filters, progress_status: value })}
          >
            {progressStatusOptions.map(status => (
              <Option key={status} value={status}>{status}</Option>
            ))}
          </Select>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增企业
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={companies}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title={editingCompany ? '编辑企业' : '新增企业'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="企业名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="introduction" label="企业简介">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="industry" label="行业">
            <Input />
          </Form.Item>
          <Form.Item name="annual_revenue" label="年营业额">
            <Input placeholder="例如：1000 万" />
          </Form.Item>
          <Form.Item name="financial_info" label="财务信息">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="upstream_info" label="上游信息">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="downstream_info" label="下游信息">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="progress_status" label="进度状态" initialValue="初步接触">
            <Select>
              {progressStatusOptions.map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_account_opened" label="是否开户" valuePropName="checked" initialValue={false}>
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_payroll_service" label="是否代发" valuePropName="checked" initialValue={false}>
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active_customer" label="是否有效户" valuePropName="checked" initialValue={false}>
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_high_quality" label="是否高质量" valuePropName="checked" initialValue={false}>
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyList;
