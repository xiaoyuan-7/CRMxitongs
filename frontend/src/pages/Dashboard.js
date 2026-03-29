import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Progress } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  StarOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const COLORS = ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d'];

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [conversion, setConversion] = useState({});
  const [followUpStats, setFollowUpStats] = useState({ daily: [], total: 0 });
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [progressDistribution, setProgressDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, conversionRes, followUpRes, trendRes, progressRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/dashboard/conversion'),
        axios.get('/api/dashboard/follow-up-stats?period=30'),
        axios.get('/api/dashboard/performance-trend?months=6'),
        axios.get('/api/dashboard/progress-distribution')
      ]);

      setStats(statsRes.data);
      setConversion(conversionRes.data);
      setFollowUpStats(followUpRes.data);
      setPerformanceTrend(trendRes.data);
      setProgressDistribution(progressRes.data);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: '企业总数',
      value: stats.totalCompanies || 0,
      icon: <TeamOutlined />,
      color: '#1890ff'
    },
    {
      title: '关键人总数',
      value: stats.totalContacts || 0,
      icon: <UserOutlined />,
      color: '#13c2c2'
    },
    {
      title: '已开户',
      value: stats.accountOpened || 0,
      icon: <CheckCircleOutlined />,
      color: '#52c41a'
    },
    {
      title: '高质量客户',
      value: stats.highQuality || 0,
      icon: <StarOutlined />,
      color: '#faad14'
    }
  ];

  const conversionData = [
    { name: '开户转化率', value: parseFloat(conversion.accountOpenedRate || 0) },
    { name: '代发转化率', value: parseFloat(conversion.payrollServiceRate || 0) },
    { name: '有效户转化率', value: parseFloat(conversion.activeRate || 0) },
    { name: '高质量转化率', value: parseFloat(conversion.highQualityRate || 0) }
  ];

  const progressChartData = progressDistribution.map(item => ({
    name: item.progress_status,
    value: item.count
  }));

  return (
    <div>
      <Row gutter={[16, 16]}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="转化率分析">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="进度状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={progressChartData}
                  cx="50%"
                  cy="50%"
                  labelLine
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {progressChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="跟进趋势（30 天）">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={followUpStats.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#1890ff" name="跟进次数" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Statistic title="总跟进次数" value={followUpStats.total} prefix={<RiseOutlined />} />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="业绩趋势（6 个月）">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new_companies" fill="#1890ff" name="新增企业" />
                <Bar dataKey="account_opened" fill="#52c41a" name="开户数" />
                <Bar dataKey="high_quality" fill="#faad14" name="高质量" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="转化漏斗">
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>开户转化率</span>
                  <span>{conversion.accountOpenedRate || 0}%</span>
                </div>
                <Progress percent={parseFloat(conversion.accountOpenedRate || 0)} status="active" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>代发服务转化率</span>
                  <span>{conversion.payrollServiceRate || 0}%</span>
                </div>
                <Progress percent={parseFloat(conversion.payrollServiceRate || 0)} status="active" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>有效户转化率</span>
                  <span>{conversion.activeRate || 0}%</span>
                </div>
                <Progress percent={parseFloat(conversion.activeRate || 0)} status="active" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>高质量客户转化率</span>
                  <span>{conversion.highQualityRate || 0}%</span>
                </div>
                <Progress percent={parseFloat(conversion.highQualityRate || 0)} status="active" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
