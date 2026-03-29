import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Descriptions, Card, message, Tag, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContact();
  }, [id]);

  const loadContact = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/contacts/${id}`);
      setContact(response.data);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';
    const today = dayjs();
    const birth = dayjs(birthDate);
    return today.diff(birth, 'year');
  };

  const getNextBirthday = (birthDate) => {
    if (!birthDate) return '-';
    const today = dayjs();
    const birth = dayjs(birthDate);
    let nextBirthday = birth.year(today.year());
    if (nextBirthday.isBefore(today, 'day')) {
      nextBirthday = nextBirthday.add(1, 'year');
    }
    return nextBirthday.format('YYYY-MM-DD');
  };

  const getZodiacSign = (birthDate) => {
    if (!birthDate) return '-';
    const year = dayjs(birthDate).year();
    const zodiacs = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
    return zodiacs[year % 12];
  };

  if (loading || !contact) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(`/companies/${contact.company_id}`)}
        style={{ marginBottom: 16 }}
      >
        返回企业详情
      </Button>

      <Card title="关键人详情">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="姓名">{contact.name}</Descriptions.Item>
          <Descriptions.Item label="所属企业">
            <a onClick={() => navigate(`/companies/${contact.company_id}`)}>
              {contact.company_name}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label="职位">{contact.position || '-'}</Descriptions.Item>
          <Descriptions.Item label="是否主要联系人">
            {contact.is_primary ? <Tag color="gold">是</Tag> : <Tag>否</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="出生年月">
            {contact.birth_date ? dayjs(contact.birth_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="年龄">
            {calculateAge(contact.birth_date)}
          </Descriptions.Item>
          <Descriptions.Item label="生肖">
            {getZodiacSign(contact.birth_date)}
          </Descriptions.Item>
          <Descriptions.Item label="下次生日">
            {getNextBirthday(contact.birth_date)}
          </Descriptions.Item>
          <Descriptions.Item label="家庭信息" span={2}>
            {contact.family_info || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="喜好" span={2}>
            {contact.preferences || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="推荐送礼" span={2}>
            {contact.gift_recommendations || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="送礼建议" style={{ marginTop: 16 }}>
        <div style={{ padding: '20px 0' }}>
          {contact.gift_recommendations ? (
            <div style={{ lineHeight: 2 }}>
              <p>📋 <strong>推荐礼品：</strong>{contact.gift_recommendations}</p>
              {contact.preferences && (
                <p>❤️ <strong>个人喜好：</strong>{contact.preferences}</p>
              )}
              {contact.birth_date && (
                <p>🎂 <strong>生日提醒：</strong>下次生日是 {getNextBirthday(contact.birth_date)}，
                   年龄 {calculateAge(contact.birth_date)} 岁，生肖{getZodiacSign(contact.birth_date)}
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#999' }}>暂无送礼建议，请完善关键人信息</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ContactDetail;
