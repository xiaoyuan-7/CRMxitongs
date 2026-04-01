PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
INSERT INTO users VALUES(1,'admin','$2a$10$g3WG9VxJQbbYqi7riMpbdeL/ARzhMA3F1mDmxeYMnjBJkNW3tpjKe','admin','2026-03-16 01:10:29','2026-03-16 01:10:29');
CREATE TABLE companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          introduction TEXT,
          industry TEXT,
          financial_info TEXT,
          upstream_info TEXT,
          downstream_info TEXT,
          is_account_opened INTEGER DEFAULT 0,
          is_payroll_service INTEGER DEFAULT 0,
          is_active_customer INTEGER DEFAULT 0,
          is_high_quality INTEGER DEFAULT 0,
          progress_status TEXT DEFAULT '初步接触',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        , task_id INTEGER, landing_cycle TEXT DEFAULT 'ongoing', active_count INTEGER DEFAULT 0, hq_count INTEGER DEFAULT 0, annual_revenue TEXT, xinfutong INTEGER DEFAULT 0, manager_name TEXT, remarks TEXT, xinfutong_status TEXT DEFAULT 'not_applicable', xinfutong_details TEXT, contact_frequency TEXT DEFAULT '低频', main_product TEXT, vat_tax TEXT, income_tax TEXT, domestic_settlement TEXT, cross_border TEXT, main_banks TEXT, personal_cards TEXT, asset_status TEXT, family_status TEXT, venture_status TEXT, executive_stock INTEGER, listing_plan TEXT, top5_customers TEXT, revenue_range TEXT, net_profit INTEGER);
INSERT INTO companies VALUES(13,'深圳市宝安区尚德社会工作服务中心',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 10:37:26','2026-03-18 14:05:59',5,'quarter',200,20,NULL,0,'冯志翔',NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(14,'深圳市宝安区益民社会工作服务中心',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:00:36','2026-03-24 02:17:20',5,'quarter',200,20,NULL,0,'冯志翔',NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(15,'先歌国际影音股份有限公司',NULL,'音响制品',NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:04:21','2026-03-24 02:16:46',5,'quarter',1000,100,NULL,0,'廖灵通',NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(16,'深圳市和顺堂医药有限公司',NULL,'中医药',NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:04:55','2026-03-24 02:14:52',5,'ongoing',100,10,NULL,0,'冯志翔',NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(17,'深圳索斯特照明有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:05:34','2026-03-18 13:18:47',5,'quarter',100,10,NULL,0,'林玉婵',NULL,'applicable',NULL,'中频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(18,'深圳日日佳显示技术有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:06:45','2026-03-23 04:38:36',5,'quarter',100,10,NULL,0,'廖灵通',NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(19,'深圳市新国都股份有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:07:25','2026-03-24 02:14:37',5,'quarter',200,20,NULL,0,'武纪元',NULL,'applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(20,'深圳市得润电子股份有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:07:46','2026-03-18 13:35:21',5,'ongoing',100,10,NULL,0,'林玉婵',NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(21,'深圳正康骨科医院',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:11:02','2026-03-24 02:17:25',5,'ongoing',100,10,NULL,0,'毛良聪',NULL,'applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(22,'新永胜科技（深圳）有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:15:39','2026-03-24 02:14:57',5,'quarter',500,50,NULL,0,'张祥霖',NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(23,'深圳市恒之易电子商务有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-18 11:16:09','2026-03-23 10:53:05',5,'quarter',500,50,NULL,0,'张祥霖',NULL,'applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(24,'深圳市福瑞诺科技有限公司','','','','','',0,0,0,0,'初步接触','2026-03-19 11:13:04','2026-03-19 23:00:31',5,'ongoing',0,0,NULL,0,'林玉婵','正在跟进薪福通','applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(25,'深圳市吉昌盛电路技术有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-19 21:59:52','2026-03-23 01:11:52',6,'quarter',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(26,'华安芯（深圳）有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-19 22:00:29','2026-03-27 00:49:18',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(27,'深圳市至鑫海科技开发有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-19 22:01:16','2026-03-19 22:01:16',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(29,'深圳市中瑞五金制品有限公司','老板个人卡似乎有需求','','','','',0,0,0,0,'初步接触','2026-03-19 22:07:36','2026-03-25 05:49:16',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(30,'深圳市锦盛光电有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-20 09:49:08','2026-03-20 09:49:08',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(31,'深圳市鑫永成科技有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-20 09:51:39','2026-03-20 09:51:39',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(32,'深圳思远国际货运代理有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-20 09:54:53','2026-03-22 12:33:02',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达','','','','','','','','','','',0,'','','',NULL);
CREATE TABLE contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          position TEXT,
          birth_date DATE,
          family_info TEXT,
          preferences TEXT,
          gift_recommendations TEXT,
          is_primary INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );
INSERT INTO contacts VALUES(1,1,'张1总','总经理','1975-01-15','已婚，有一子','喜欢喝茶、高尔夫','高档茶叶、高尔夫用品',1,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(2,1,'李1经理','财务经理','1985-02-20','未婚','喜欢读书、旅游','书籍、旅行券',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(3,2,'李5经理','财务经理','1985-06-20','未婚','喜欢读书、旅游','书籍、旅行券',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(4,2,'张5总','总经理','1975-05-15','已婚，有一子','喜欢喝茶、高尔夫','高档茶叶、高尔夫用品',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(5,4,'张2总','总经理','1975-02-15','已婚，有一子','喜欢喝茶、高尔夫','高档茶叶、高尔夫用品',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(6,4,'李2经理','财务经理','1985-03-20','未婚','喜欢读书、旅游','书籍、旅行券',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(7,5,'李4经理','财务经理','1985-05-20','未婚','喜欢读书、旅游','书籍、旅行券',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(8,3,'李3经理','财务经理','1985-04-20','未婚','喜欢读书、旅游','书籍、旅行券',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(9,5,'张4总','总经理','1975-04-15','已婚，有一子','喜欢喝茶、高尔夫','高档茶叶、高尔夫用品',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(10,3,'张3总','总经理','1975-03-15','已婚，有一子','喜欢喝茶、高尔夫','高档茶叶、高尔夫用品',0,'2026-03-16 01:10:29','2026-03-16 01:10:29');
INSERT INTO contacts VALUES(11,6,'万总','总经理','','已婚','','',0,'2026-03-16 13:35:06','2026-03-16 13:35:06');
INSERT INTO contacts VALUES(12,13,'郭明仁','老板','1983-09-03','一儿一女，住天骄','','',0,'2026-03-18 13:08:14','2026-03-18 13:08:14');
INSERT INTO contacts VALUES(13,17,'万总','',NULL,'','','',0,'2026-03-18 13:19:22','2026-03-18 13:19:22');
INSERT INTO contacts VALUES(14,16,'宋刚','老板',NULL,'','','',0,'2026-03-18 13:23:21','2026-03-18 13:23:21');
INSERT INTO contacts VALUES(15,16,'王妍','',NULL,'','','',0,'2026-03-18 13:24:00','2026-03-18 13:24:00');
CREATE TABLE marketing_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          contact_id INTEGER,
          follow_up_date DATETIME NOT NULL,
          follow_up_type TEXT,
          follow_up_content TEXT,
          next_follow_up_date DATETIME,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );
CREATE TABLE reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          contact_id INTEGER,
          company_id INTEGER,
          reminder_type TEXT NOT NULL,
          reminder_date DATE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          is_completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );
CREATE TABLE marketing_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, status TEXT DEFAULT '进行中', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO marketing_tasks VALUES(5,'重点跟进企业','','进行中','2026-03-17 11:34:31','2026-03-17 11:34:31');
INSERT INTO marketing_tasks VALUES(6,'新客户营销','','进行中','2026-03-19 21:58:27','2026-03-19 21:58:27');
CREATE TABLE week_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    company_name TEXT,
    plan_date TEXT,
    action TEXT,
    priority TEXT DEFAULT 'medium',
    week_start TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, time_period TEXT DEFAULT 'am', description TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );
INSERT INTO week_tasks VALUES(5,NULL,NULL,'2026-03-19','货运拜访','medium','2026-03-15','completed','2026-03-19 21:37:50','am',NULL);
INSERT INTO week_tasks VALUES(9,18,'深圳日日佳显示技术有限公司','2026-03-23','拜访','medium','2026-03-23','completed','2026-03-20 14:05:21','am',NULL);
INSERT INTO week_tasks VALUES(10,23,'深圳市恒之易电子商务有限公司','2026-03-23','薪福通宣讲','medium','2026-03-23','completed','2026-03-20 14:06:16','pm',NULL);
INSERT INTO week_tasks VALUES(11,15,'先歌国际影音股份有限公司','2026-03-24','薪福通培训','medium','2026-03-23','completed','2026-03-20 14:06:54','am',NULL);
INSERT INTO week_tasks VALUES(12,NULL,NULL,'2026-03-24','深圳市红心养老产业发展有限公司','medium','2026-03-23','completed','2026-03-20 14:08:16','pm','颐年卡办理');
INSERT INTO week_tasks VALUES(13,NULL,NULL,'2026-03-26','航城智谷园区活动','medium','2026-03-23','completed','2026-03-20 14:08:57','pm',NULL);
INSERT INTO week_tasks VALUES(14,NULL,NULL,'2026-03-23','约访王弢','medium','2026-03-23','completed','2026-03-20 14:09:38','am',NULL);
INSERT INTO week_tasks VALUES(15,NULL,NULL,'2026-03-23','可能县医院资产管理系统配置的提醒','medium',NULL,'completed','2026-03-23 01:25:58','am',NULL);
INSERT INTO week_tasks VALUES(16,NULL,NULL,'2026-03-23','诺盖世界福瑞诺改时间','medium',NULL,'completed','2026-03-23 01:28:48','am',NULL);
INSERT INTO week_tasks VALUES(17,NULL,NULL,'2026-03-23','把融合表调换填','medium',NULL,'pending','2026-03-23 01:29:30','am',NULL);
INSERT INTO week_tasks VALUES(18,NULL,NULL,'2026-03-23','联系一下新航物流财务','medium',NULL,'completed','2026-03-23 01:33:49','am',NULL);
INSERT INTO week_tasks VALUES(19,NULL,NULL,'2026-03-23','联系一下益民社工','medium',NULL,'completed','2026-03-23 01:39:35','am',NULL);
INSERT INTO week_tasks VALUES(20,NULL,NULL,'2026-03-25','慧家老板办理信用卡','medium','2026-03-23','completed','2026-03-23 01:46:39','am',NULL);
INSERT INTO week_tasks VALUES(22,NULL,NULL,'2026-03-27','深圳市芯睿视科技有限公司','medium','2026-03-23','completed','2026-03-23 13:41:47','pm','下午茶');
INSERT INTO week_tasks VALUES(24,NULL,NULL,'2026-03-26','新国都会议','medium',NULL,'completed','2026-03-25 16:06:38','am',NULL);
INSERT INTO week_tasks VALUES(25,NULL,NULL,'2026-03-27','方正代发线索签代发','medium','2026-03-23','completed','2026-03-26 10:40:02','am',NULL);
INSERT INTO week_tasks VALUES(27,23,'深圳市恒之易电子商务有限公司','2026-03-31','上门开卡','medium','2026-03-30','pending','2026-03-26 22:53:06','am',NULL);
INSERT INTO week_tasks VALUES(28,23,'深圳市恒之易电子商务有限公司','2026-04-01','上门开卡','medium','2026-03-30','pending','2026-03-26 22:53:23','am',NULL);
INSERT INTO week_tasks VALUES(29,NULL,NULL,'2026-03-30','王弢上门拜访','medium','2026-03-30','pending','2026-03-26 22:54:11','am',NULL);
INSERT INTO week_tasks VALUES(30,NULL,NULL,'2026-03-30','新征程上门开卡','medium','2026-03-30','pending','2026-03-26 22:54:41','pm',NULL);
INSERT INTO week_tasks VALUES(31,NULL,NULL,'2026-04-03','和顺堂摆展','medium','2026-03-30','pending','2026-03-26 22:56:07','am',NULL);
INSERT INTO week_tasks VALUES(32,NULL,NULL,'2026-04-03','盘户会','medium','2026-03-30','pending','2026-03-26 22:56:28','pm',NULL);
INSERT INTO week_tasks VALUES(33,NULL,NULL,'2026-03-30','一处颐年卡送卡','medium','2026-03-30','pending','2026-03-26 22:57:02','pm',NULL);
INSERT INTO week_tasks VALUES(34,NULL,NULL,'2026-04-02','全天颐年卡送卡','medium','2026-03-30','pending','2026-03-26 22:57:23','am',NULL);
INSERT INTO week_tasks VALUES(35,NULL,NULL,'2026-04-01','宝安中学食堂办卡','medium','2026-03-30','pending','2026-03-27 02:15:52','pm',NULL);
CREATE TABLE xinfutong_details (id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER UNIQUE, is_registered INTEGER DEFAULT 0, modules TEXT, config_status TEXT, config_teacher TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE);
INSERT INTO xinfutong_details VALUES(1,3,1,'费控报销','一配置','郑秋金','2026-03-17 13:46:14','2026-03-18 04:36:20');
INSERT INTO xinfutong_details VALUES(2,21,1,'资产管理','','郑秋金','2026-03-18 11:12:41','2026-03-18 11:12:41');
INSERT INTO xinfutong_details VALUES(3,17,1,'费控报销','试用中','郑秋金','2026-03-18 11:22:36','2026-03-18 11:22:36');
INSERT INTO xinfutong_details VALUES(4,23,0,'','','','2026-03-18 13:32:55','2026-03-18 13:32:55');
INSERT INTO xinfutong_details VALUES(5,19,1,'','','','2026-03-18 14:06:38','2026-03-18 14:06:38');
INSERT INTO xinfutong_details VALUES(6,24,0,'','下周注册使用','','2026-03-19 21:36:53','2026-03-19 21:36:53');
CREATE TABLE lead_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
  );
INSERT INTO lead_boards VALUES(2,'林玉婵管户','','2026-03-20 14:44:16',NULL);
INSERT INTO lead_boards VALUES(3,'冯志翔管户','','2026-03-20 14:56:38',NULL);
CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    company_name TEXT NOT NULL,
    employee_count TEXT,
    is_visited INTEGER DEFAULT 0,
    visit_status TEXT,
    manager_name TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES lead_boards(id)
  );
INSERT INTO leads VALUES(1,3,'深圳','50',0,'','冯市场',NULL,'new','2026-03-20 15:01:04');
CREATE TABLE referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_date TEXT NOT NULL,
    from_department TEXT NOT NULL,
    from_person TEXT NOT NULL,
    to_department TEXT NOT NULL,
    to_person TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    business_status TEXT DEFAULT 'pending',
    amount REAL DEFAULT 0,
    points_rule TEXT DEFAULT 'standard',
    final_points INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
INSERT INTO referrals VALUES(1,'2026-03-20','市拓条线','谢文强','公司条线','徐嘉蔚','深圳思远国际货运代理有限公司','pending',0.0,'standard',0,'','2026-03-21 06:23:19','2026-03-21 06:25:49');
INSERT INTO referrals VALUES(2,'2026-03-23','理财条线','武孝龙','公司条线','林玉婵','深圳索斯特照明有限公司','pending',0.0,'standard',0,'','2026-03-21 06:25:30','2026-03-21 06:25:30');
INSERT INTO referrals VALUES(3,'2026-03-04','市拓条线','谢文强','公司条线','张祥霖','深圳市杰恩瑞科技有限公司','completed',0.0,'standard',1,'','2026-03-21 06:28:00','2026-03-21 06:28:00');
INSERT INTO referrals VALUES(4,'2026-03-02','市拓条线','谢文强','公司条线','张祥霖','深圳市至鑫海科技开发有限公司','pending',0.0,'standard',0,'高质量开户','2026-03-21 06:30:06','2026-03-21 06:30:06');
INSERT INTO referrals VALUES(5,'2026-03-21','市拓条线','谢文强','公司条线','廖灵通','深圳市吉昌盛电路技术有限公司','pending',0.0,'standard',0,'高质量、授信','2026-03-21 07:52:30','2026-03-21 07:52:30');
CREATE TABLE follow_ups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          follow_date DATE NOT NULL,
          follow_time TEXT DEFAULT '上午',
          follow_type TEXT DEFAULT '电话',
          follow_content TEXT NOT NULL,
          next_follow_date DATE,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );
INSERT INTO follow_ups VALUES(1,1,'2026-03-23','am','电话','测试跟进记录','2026-03-30','测试备注','2026-03-23 12:18:04');
INSERT INTO follow_ups VALUES(2,23,'2026-03-23','am','上门','沟通对接个税和薪资代发API，员工收集卡号准备开卡',NULL,'','2026-03-23 13:43:00');
INSERT INTO follow_ups VALUES(3,14,'2026-03-24','am','微信','跟进新合同，预计本周，下周可以再问',NULL,'','2026-03-26 00:48:55');
INSERT INTO follow_ups VALUES(4,29,'2026-03-25','am','微信','微信约访暂时不在，可再次约访',NULL,'','2026-03-26 00:49:34');
INSERT INTO follow_ups VALUES(5,21,'2026-03-24','am','微信','跟进目前各医院资产管理系统配置情况，需安排时间与总部汇报',NULL,'','2026-03-26 00:50:25');
INSERT INTO follow_ups VALUES(6,26,'2026-03-25','am','电话','已完成开户，老板近期出差，需跟进授信情况',NULL,'','2026-03-26 00:51:05');
INSERT INTO follow_ups VALUES(7,15,'2026-03-24','am','上门','IT培训，罗总推动开卡，老板目前不同意',NULL,'','2026-03-26 00:51:47');
INSERT INTO follow_ups VALUES(8,30,'2026-03-25','am','微信','微信联系无回复',NULL,'','2026-03-27 00:48:38');
INSERT INTO follow_ups VALUES(9,25,'2026-03-24','am','电话','电话联系说近期较忙',NULL,'','2026-03-27 00:49:10');
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('companies',32);
INSERT INTO sqlite_sequence VALUES('users',1);
INSERT INTO sqlite_sequence VALUES('contacts',15);
INSERT INTO sqlite_sequence VALUES('marketing_tasks',6);
INSERT INTO sqlite_sequence VALUES('week_tasks',35);
INSERT INTO sqlite_sequence VALUES('xinfutong_details',6);
INSERT INTO sqlite_sequence VALUES('lead_boards',3);
INSERT INTO sqlite_sequence VALUES('leads',1);
INSERT INTO sqlite_sequence VALUES('referrals',5);
INSERT INTO sqlite_sequence VALUES('follow_ups',9);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_marketing_company ON marketing_progress(company_id);
CREATE INDEX idx_reminders_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_contact ON reminders(contact_id);
CREATE INDEX idx_follow_ups_company ON follow_ups(company_id);
COMMIT;
