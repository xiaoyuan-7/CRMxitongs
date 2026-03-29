import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Card, Tabs, Table, Button, Modal, Form, Input, DatePicker, Select, Space, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [marketingRecords, setMarketingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [isMarketingModalVisible, setIsMarketingModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [contactForm] = Form.useForm();
  const [marketingForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companyRes, contactsRes, marketingRes] = await Promise.all([
        axios.get(`/api/companies/${id}`),
        axios.get(`/api/contacts/company/${id}`),
        axios.get(`/api/marketing/company/${id}`)
      ]);
      setCompany(companyRes.data);
      setContacts(contactsRes.data);
      setMarketingRecords(marketingRes.data);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    contactForm.resetFields();
    contactForm.setFieldsValue({ company_id: id, is_primary: contacts.length === 0 });
    setIsContactModalVisible(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    contactForm.setFieldsValue(contact);
    setIsContactModalVisible(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await axios.delete(`/api/contacts/${contactId}`);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSaveContact = async () => {
    try {
      const values = await contactForm.validateFields();
      if (editingContact) {
        await axios.put(`/api/contacts/${editingContact.id}`, values);
        message.success('更新成功');
      } else {
        await axios.post('/api/contacts', values);
        message.success('创建成功');
      }
      setIsContactModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleAddMarketing = () => {
    setEditingRecord(null);
    marketingForm.resetFields();
    marketingForm.setFieldsValue({ company_id: id, follow_up_date: dayjs() });
    setIsMarketingModalVisible(true);
  };

  const handleEditMarketing = (record) => {
    setEditingRecord(record);
    marketingForm.setFieldsValue({
      ...record,
      follow_up_date: dayjs(record.follow_up_date),
      next_follow_up_date: record.next_follow_up_date ? dayjs(record.next_follow_up_date) : null
    });
    setIsMarketingModalVisible(true);
  };

  const handleDeleteMarketing = async (recordId) => {
    try {
      await axios.delete(`/api/marketing/${recordId}`);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSaveMarketing = async () => {
    try {
      const values = await marketingForm.validateFields();
      const data = {
        ...values,
        follow_up_date: values.follow_up_date.format('YYYY-MM-DD'),
        next_follow_up_date: values.next_follow_up_date ? values.next_follow_up_date.format('YYYY-MM-DD') : null
      };
      if (editingRecord) {
        await axios.put(`/api/marketing/${editingRecord.id}`, data);
        message.success('更新成功');
      } else {
        await axios.post('/api/marketing', data);
        message.success('创建成功');
      }
      setIsMarketingModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const contactColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/contacts/${record.id}`)}>
          {text} {record.is_primary && <Tag color="gold">主要</Tag>}
        </a>
      )
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position'
    },
    {
      title: '生日',
      dataIndex: 'birth_date',
      key: 'birth_date'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditContact(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDeleteContact(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const marketingColumns = [
    {
      title: '跟进日期',
      dataIndex: 'follow_up_date',
      key: 'follow_up_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '跟进类型',
      dataIndex: 'follow_up_type',
      key: 'follow_up_type'
    },
    {
      title: '联系人',
      dataIndex: 'contact_name',
      key: 'contact_name'
    },
    {
      title: '跟进内容',
      dataIndex: 'follow_up_content',
      key: 'follow_up_content',
      ellipsis: true
    },
    {
      title: '下次跟进',
      dataIndex: 'next_follow_up_date',
      key: 'next_follow_up_date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditMarketing(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDeleteMarketing(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (loading || !company) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions title="企业信息" bordered column={2}>
          <Descriptions.Item label="企业名称">{company.name}</Descriptions.Item>
          <Descriptions.Item label="行业">{company.industry || '-'}</Descriptions.Item>
          <Descriptions.Item label="年营业额">{company.annual_revenue || '-'}</Descriptions.Item>
          <Descriptions.Item label="进度状态">
            <Tag color="processing">{company.progress_status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="是否开户">
            <Tag color={company.is_account_opened ? 'green' : 'red'}>
              {company.is_account_opened ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="是否代发">
            <Tag color={company.is_payroll_service ? 'blue' : 'default'}>
              {company.is_payroll_service ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="有效户">
            <Tag color={company.is_active_customer ? 'green' : 'default'}>
              {company.is_active_customer ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="高质量">
            <Tag color={company.is_high_quality ? 'gold' : 'default'}>
              {company.is_high_quality ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="关键人数量">{company.contact_count || 0}</Descriptions.Item>
          <Descriptions.Item label="跟进次数">{company.follow_up_count || 0}</Descriptions.Item>
          <Descriptions.Item label="企业简介" span={2}>
            {company.introduction || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="财务信息" span={2}>
            {company.financial_info || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="上游信息" span={2}>
            {company.upstream_info || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="下游信息" span={2}>
            {company.downstream_info || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs defaultActiveKey="contacts">
        <TabPane tab={<span><UserOutlined />关键人列表</span>} key="contacts">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddContact}>
              添加关键人
            </Button>
          </div>
          <Table
            columns={contactColumns}
            dataSource={contacts}
            rowKey="id"
            pagination={false}
          />
        </TabPane>
        <TabPane tab="营销进度" key="marketing">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMarketing}>
              添加跟进记录
            </Button>
          </div>
          <Table
            columns={marketingColumns}
            dataSource={marketingRecords}
            rowKey="id"
            pagination={false}
          />
        </TabPane>
      </Tabs>

      {/* 关键人模态框 */}
      <Modal
        title={editingContact ? '编辑关键人' : '添加关键人'}
        open={isContactModalVisible}
        onOk={handleSaveContact}
        onCancel={() => setIsContactModalVisible(false)}
        width={600}
      >
        <Form form={contactForm} layout="vertical">
          <Form.Item name="company_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="职位">
            <Input />
          </Form.Item>
          <Form.Item name="birth_date" label="出生年月">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="family_info" label="家庭信息">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="preferences" label="喜好">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="gift_recommendations" label="推荐送礼">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="is_primary" label="设为主要联系人" valuePropName="checked">
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 营销进度模态框 */}
      <Modal
        title={editingRecord ? '编辑跟进记录' : '添加跟进记录'}
        open={isMarketingModalVisible}
        onOk={handleSaveMarketing}
        onCancel={() => setIsMarketingModalVisible(false)}
        width={600}
      >
        <Form form={marketingForm} layout="vertical">
          <Form.Item name="company_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="contact_id" label="联系人">
            <Select allowClear placeholder="选择联系人">
              {contacts.map(contact => (
                <Option key={contact.id} value={contact.id}>{contact.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="follow_up_date" label="跟进日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="follow_up_type" label="跟进类型">
            <Select>
              <Option value="电话">电话</Option>
              <Option value="拜访">拜访</Option>
              <Option value="微信">微信</Option>
              <Option value="邮件">邮件</Option>
              <Option value="会议">会议</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="follow_up_content" label="跟进内容" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="next_follow_up_date" label="下次跟进日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyDetail;
