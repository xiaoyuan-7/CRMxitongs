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
INSERT INTO companies VALUES(13,'深圳市宝安区尚德社会工作服务中心',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 10:37:26','2026-05-24 07:38:18',5,'quarter',200,20,NULL,0,'冯志翔',NULL,'not_applicable',NULL,'低频','','','','','','基本户在建行，暂无太多业务。授信行目前在交通银行，因此代发目前在交行。待约时间再跟老板沟通/','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(14,'深圳市宝安区益民社会工作服务中心',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:00:36','2026-05-21 11:50:01',5,'quarter',200,20,NULL,0,'冯志翔',NULL,'not_applicable',NULL,'本周触达','','','','','','社工的基本户基本在农行，代发目前正逐步转移至我行，前期海同社工、旭源社工、慧家社工均已全部落地，益民社工已落地60余人，预计7月完成全部转化至200人。剩余一家尚德社工目前持续营销，预计年内再落地200人。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(15,'先歌国际影音股份有限公司',NULL,'音响制品',NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:04:21','2026-05-21 11:53:29',5,'quarter',1000,100,NULL,0,'廖灵通',NULL,'not_applicable',NULL,'一月前触达','','','','','','基本户在建行，主要代发行在建行。经前期薪福通的配置与上线，老板已答应将代发转至我行，企业目前正处上市关键时期，老板提议延后办卡及代发。目前我部密切关注企业系统运行情况，以及做好关键人关系维护，持续跟进代发落地。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(16,'深圳市和顺堂医药有限公司',NULL,'中医药',NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:04:55','2026-05-24 07:40:04',5,'ongoing',100,10,NULL,0,'冯志翔',NULL,'not_applicable',NULL,'本周触达','','','','','','基本户在中国银行，企业成立年限较久，目前跟中行、华夏、民生合作较深，华夏还是企业的租户，且目前企业授信需求不高，较难切入代发，目前靠活动和异业合作角度切入合作。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(17,'深圳索斯特照明有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:05:34','2026-05-24 08:07:45',5,'quarter',100,10,NULL,0,'林玉婵',NULL,'applicable',NULL,'中频','','','','','','基本户在农行，目前代发主要在农行，且有手续费。目前正与老板沟通转换代发，老板为龙歌个人客户，关系较好，建议从老板方向突破','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(18,'深圳日日佳显示技术有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:06:45','2026-05-21 11:43:13',5,'completed',50,10,NULL,0,'廖灵通',NULL,'not_applicable',NULL,'一月前触达','','','','','','基本户为招商银行，因为主要授信行在交通银行，所有目前主要代发行在交通银行。人员70左右，经营销已在我行落地十余人代发，后续增至30左右。企业表示代发需在授信行间分配','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(19,'深圳市新国都股份有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:07:25','2026-05-24 08:06:15',5,'quarter',200,20,NULL,0,'武纪元',NULL,'applicable',NULL,'本周触达','','','','','','基本户在中国银行，目前无授信，代发在中行。我行目前提供薪福通系统，已初步配置和测试使用，待约访沟通合作。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(20,'深圳市得润电子股份有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:07:46','2026-05-24 07:34:14',5,'ongoing',100,10,NULL,0,'林玉婵',NULL,'not_applicable',NULL,'低频','','','','','','目前基本户在农行，授信及代发主要在农行，客户通过第三方建立了CBS系统对接了我行网银，目前在我行跨行发过一次，目前合作基本是外汇方面','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(21,'深圳正康骨科医院',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-18 11:11:02','2026-05-24 07:37:21',5,'quarter',100,10,NULL,0,'毛良聪',NULL,'applicable',NULL,'本周触达','','','','','','目前医院及集团公司均在我行开户，基本户目前在农行，异地医院在异地小银行。目前各医院均有授信，因现金流暂不够好，目前我行授信暂无法介入，因此较难转代发。目前我行主要以系统服务为主，提供资产管理系统、薪福通考勤系统、E餐通系统等。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(22,'新永胜科技（深圳）有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'已约访','2026-03-18 11:15:39','2026-05-26 01:52:30',5,'quarter',500,50,NULL,0,'张祥霖','跟进薪福通评估中','not_applicable',NULL,'本周触达','','','','','','基本户在中国银行，主要代发行在中国银行。目前中行刚批1000万授信，人员全部办理中行卡。我们前期营销了薪福通，因企业也有一整套完善的系统在运营，经过前期配置和评估，企业觉得接入我们系统会让他们原有模式改动较大，因此暂不考虑，目前希望我们在授信方面有合作，授信预计6月中旬，届时可以营销交换一些代发。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(23,'深圳市恒之易电子商务有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'已约访','2026-03-18 11:16:09','2026-05-21 11:54:10',5,'completed',1000,50,NULL,0,'张祥霖','开卡中','applicable',NULL,'一月前触达','','','','','','企业基本账户在中行，目前无授信，已落地。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(24,'深圳市福瑞诺科技有限公司','','','','','',0,0,0,0,'初步接触','2026-03-19 11:13:04','2026-03-19 23:00:31',5,'ongoing',0,0,NULL,0,'林玉婵','正在跟进薪福通','applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(25,'深圳市吉昌盛电路技术有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-19 21:59:52','2026-05-18 00:55:39',6,'year',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(26,'华安芯（深圳）有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-03-19 22:00:29','2026-05-13 02:10:02',6,'completed',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(27,'深圳市至鑫海科技开发有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-19 22:01:16','2026-05-13 02:10:23',6,'completed',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(29,'深圳市中瑞五金制品有限公司','老板个人卡似乎有需求','','','','',0,0,0,0,'初步接触','2026-03-19 22:07:36','2026-05-18 00:42:04',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达','','','','','','下月初联系网点见面','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(30,'深圳市锦盛光电有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-20 09:49:08','2026-03-20 09:49:08',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(31,'深圳市鑫永成科技有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-20 09:51:39','2026-03-20 09:51:39',6,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(32,'深圳思远国际货运代理有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-03-20 09:54:53','2026-05-13 02:10:09',6,'completed',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'本周触达','','','','','','','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(86,'宇天汛通讯科技（深圳）有限公司',NULL,NULL,NULL,NULL,NULL,1,0,0,0,'初步接触','2026-05-18 00:56:33','2026-05-24 08:05:16',5,'quarter',500,0,NULL,0,'张祥霖',NULL,'not_applicable',NULL,'低频','','','','','','目前基本户在工行，韶关工厂有授信，基本代发在工行。我行目前授信较难准入，提供外汇方面服务。','','','','',0,'','','',NULL);
INSERT INTO companies VALUES(87,'存量完成企业',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-05-18 01:08:48','2026-05-25 09:27:36',NULL,'completed',2162,202,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(88,'深圳市德龙包装制品有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-05-25 08:14:07','2026-05-25 08:14:27',5,'ongoing',0,0,NULL,0,'吴逸辉',NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(89,'五金制品',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-05-25 08:16:59','2026-05-25 08:16:59',5,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO companies VALUES(90,'深圳市泰和源电子有限公司',NULL,NULL,NULL,NULL,NULL,0,0,0,0,'初步接触','2026-05-29 20:41:42','2026-05-29 20:41:42',5,'ongoing',0,0,NULL,0,NULL,NULL,'not_applicable',NULL,'低频',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
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
INSERT INTO week_tasks VALUES(17,NULL,NULL,'2026-03-23','把融合表调换填','medium',NULL,'completed','2026-03-23 01:29:30','am',NULL);
INSERT INTO week_tasks VALUES(18,NULL,NULL,'2026-03-23','联系一下新航物流财务','medium',NULL,'completed','2026-03-23 01:33:49','am',NULL);
INSERT INTO week_tasks VALUES(19,NULL,NULL,'2026-03-23','联系一下益民社工','medium',NULL,'completed','2026-03-23 01:39:35','am',NULL);
INSERT INTO week_tasks VALUES(20,NULL,NULL,'2026-03-25','慧家老板办理信用卡','medium','2026-03-23','completed','2026-03-23 01:46:39','am',NULL);
INSERT INTO week_tasks VALUES(22,NULL,NULL,'2026-03-27','深圳市芯睿视科技有限公司','medium','2026-03-23','completed','2026-03-23 13:41:47','pm','下午茶');
INSERT INTO week_tasks VALUES(24,NULL,NULL,'2026-03-26','新国都会议','medium',NULL,'completed','2026-03-25 16:06:38','am',NULL);
INSERT INTO week_tasks VALUES(25,NULL,NULL,'2026-03-27','方正代发线索签代发','medium','2026-03-23','completed','2026-03-26 10:40:02','am',NULL);
INSERT INTO week_tasks VALUES(27,23,'深圳市恒之易电子商务有限公司','2026-03-31','上门开卡','medium','2026-03-30','completed','2026-03-26 22:53:06','am',NULL);
INSERT INTO week_tasks VALUES(28,23,'深圳市恒之易电子商务有限公司','2026-04-01','上门开卡','medium','2026-03-30','completed','2026-03-26 22:53:23','am',NULL);
INSERT INTO week_tasks VALUES(29,NULL,NULL,'2026-03-30','王弢上门拜访','medium','2026-03-30','completed','2026-03-26 22:54:11','am',NULL);
INSERT INTO week_tasks VALUES(30,NULL,NULL,'2026-03-30','新征程上门开卡','medium','2026-03-30','completed','2026-03-26 22:54:41','pm',NULL);
INSERT INTO week_tasks VALUES(31,NULL,NULL,'2026-04-03','和顺堂摆展','medium','2026-03-30','completed','2026-03-26 22:56:07','am',NULL);
INSERT INTO week_tasks VALUES(32,NULL,NULL,'2026-04-03','盘户会','medium','2026-03-30','completed','2026-03-26 22:56:28','pm',NULL);
INSERT INTO week_tasks VALUES(33,NULL,NULL,'2026-03-30','一处颐年卡送卡','medium','2026-03-30','completed','2026-03-26 22:57:02','pm',NULL);
INSERT INTO week_tasks VALUES(34,NULL,NULL,'2026-04-02','全天颐年卡送卡','medium','2026-03-30','completed','2026-03-26 22:57:23','am',NULL);
INSERT INTO week_tasks VALUES(35,NULL,NULL,'2026-04-01','宝安中学食堂办卡','medium','2026-03-30','completed','2026-03-27 02:15:52','pm',NULL);
INSERT INTO week_tasks VALUES(36,NULL,NULL,'','园区系统询问','medium',NULL,'completed','2026-03-30 01:05:51','am',NULL);
INSERT INTO week_tasks VALUES(37,NULL,NULL,'','申报考勤','medium',NULL,'completed','2026-05-12 08:48:15','am',NULL);
INSERT INTO week_tasks VALUES(38,NULL,NULL,'','提报销','medium',NULL,'completed','2026-05-12 08:48:24','am',NULL);
INSERT INTO week_tasks VALUES(39,NULL,NULL,'','打电话','medium',NULL,'completed','2026-05-12 08:48:37','am',NULL);
INSERT INTO week_tasks VALUES(40,NULL,NULL,'2026-05-14','威博工程开卡','medium','2026-05-11','completed','2026-05-13 02:16:26','am',NULL);
INSERT INTO week_tasks VALUES(41,NULL,NULL,'2026-05-15','宝安人民医院','medium','2026-05-11','completed','2026-05-13 02:16:52','pm',NULL);
INSERT INTO week_tasks VALUES(42,NULL,NULL,'','霖客','medium',NULL,'completed','2026-05-17 23:42:45','am',NULL);
INSERT INTO week_tasks VALUES(43,NULL,NULL,'','百亨开卡','medium',NULL,'completed','2026-05-18 00:35:05','am',NULL);
INSERT INTO week_tasks VALUES(44,NULL,NULL,'2026-05-20','德龙包装','medium','2026-05-18','completed','2026-05-18 04:38:07','am',NULL);
INSERT INTO week_tasks VALUES(45,NULL,NULL,'','鼎盛多层电子开卡','medium',NULL,'completed','2026-05-20 02:56:48','am',NULL);
INSERT INTO week_tasks VALUES(46,NULL,NULL,'2026-05-29','德龙包装','medium','2026-05-25','completed','2026-05-25 09:16:52','pm',NULL);
INSERT INTO week_tasks VALUES(47,NULL,NULL,'2026-05-29','思诺信','medium','2026-05-25','completed','2026-05-25 09:18:13','am',NULL);
INSERT INTO week_tasks VALUES(48,NULL,NULL,'2026-05-27','电建市政','medium','2026-05-25','completed','2026-05-25 09:18:30','pm',NULL);
INSERT INTO week_tasks VALUES(49,NULL,NULL,'2026-05-28','恒之易','medium','2026-05-25','pending','2026-05-25 09:18:57','pm',NULL);
INSERT INTO week_tasks VALUES(50,NULL,NULL,'2026-05-26','鼎盛多层电子开卡','medium','2026-05-25','pending','2026-05-29 20:33:59','am',NULL);
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
INSERT INTO lead_boards VALUES(4,'张祥霖管户','对公客户经理张祥霖管户企业','2026-05-06 13:53:27',NULL);
INSERT INTO lead_boards VALUES(5,'吴逸辉管户','对公客户经理吴逸辉管户企业','2026-05-06 13:53:27',NULL);
INSERT INTO lead_boards VALUES(6,'李紫茹管户','对公客户经理李紫茹管户企业','2026-05-06 13:53:27',NULL);
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, daily_deposit TEXT, credit_exposure TEXT,
    FOREIGN KEY (board_id) REFERENCES lead_boards(id)
  );
INSERT INTO leads VALUES(2,4,'广东建华盛建设工程有限公司','',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(3,4,'深圳市恒巽物流有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(4,4,'深圳市智优模型有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(5,4,'深圳市木深土石方工程有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(6,4,'深圳市摆渡一下物流有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(7,4,'深圳市鸿昌顺通物流有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(8,4,'深圳安特塑胶工业有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(10,2,'深圳市得润光学有限公司','-',0,'暂无','林玉婵','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(11,2,'深圳市华源达科技有限公司','-',0,'暂无','林玉婵','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(12,2,'深圳盛庆鹏饮食实业有限公司','-',1,'已拉群对接','林玉婵','已约访','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(13,2,'深圳市广福盛达餐饮管理有限公司','-',0,'暂无','林玉婵','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(14,2,'深圳市悦和智慧科技有限公司','-',0,'暂无','林玉婵','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(15,2,'深圳市世源工贸有限公司','-',1,'授信强绑定','林玉婵','已约访','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(16,2,'深圳市唯绿农产品有限公司','-',0,'暂无','林玉婵','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(17,2,'深圳市昆龙卓盈机电有限公司','-',0,'暂无','林玉婵','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(18,5,'星江南人力资源（深圳）有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(19,5,'深圳市拓齐科技有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(20,5,'深圳市德利行汽车销售服务有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(21,5,'深圳耀天齐实业有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(22,5,'深圳星航物流科学技术有限公司','-',1,'他行配置系统，跟进中','吴逸辉','已约访','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(23,5,'深圳市银方电子有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(24,5,'深圳市伊格诺米科技有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(25,5,'深圳市镇安物业管理有限公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(26,5,'深圳市小恒榕科技有限责任公司','-',0,'暂无','吴逸辉','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(27,4,'深圳市易中电子有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(28,3,'深圳雅森建筑钢结构工程有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(29,3,'深圳逸安科技有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(30,3,'利华服饰智造（深圳）有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(31,3,'深圳市正康达饮食实业有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(32,3,'深圳达芬奇生物科技有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(33,3,'深圳市壹佰实业有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(34,3,'深圳市时谐电子科技有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(35,3,'深圳市普斯德光电有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(36,3,'嘉峰科技（深圳）有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(37,3,'深圳市康斯德科技有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(38,3,'东莞市圣鼎源科技有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(39,3,'深圳市优可新科技有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(40,3,'联合微创医疗器械（深圳）有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(41,6,'深圳市立可自动化设备有限公司','-',0,'暂无','李紫茹','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(42,6,'深圳市智铭盛科技有限公司','-',0,'暂无','李紫茹','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(47,6,'深圳敖士科技有限公司','-',0,'暂无','李紫茹','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(48,6,'深圳市格林通国际货运代理有限公司','-',0,'暂无','李紫茹','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(49,3,'深圳市美捷森特种电路技术有限公司','-',0,'暂无','冯志翔','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(50,4,'新永胜科技（深圳）有限公司','-',1,'跟进薪福通评估中','张祥霖','已约访','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(51,4,'深圳市旺坤光电技术有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
INSERT INTO leads VALUES(52,4,'深圳市蓝硕通讯设备有限公司','-',0,'暂无','张祥霖','','new','2026-05-06 13:54:16',NULL,NULL);
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
  , points_calculate INTEGER DEFAULT 1);
INSERT INTO referrals VALUES(1,'2026-05-12','市拓条线','谢文强','公司条线','徐嘉蔚','深圳思远国际货运代理有限公司','completed',0.0,'standard',1,'','2026-03-21 06:23:19','2026-05-13 09:23:14',1);
INSERT INTO referrals VALUES(2,'2026-03-23','理财条线','武孝龙','公司条线','林玉婵','深圳索斯特照明有限公司','completed',0.0,'standard',1,'','2026-03-21 06:25:30','2026-03-21 06:25:30',1);
INSERT INTO referrals VALUES(3,'2026-03-04','市拓条线','谢文强','公司条线','张祥霖','深圳市杰恩瑞科技有限公司','completed',0.0,'standard',1,'','2026-03-21 06:28:00','2026-03-21 06:28:00',1);
INSERT INTO referrals VALUES(4,'2026-03-02','市拓条线','谢文强','公司条线','张祥霖','深圳市至鑫海科技开发有限公司','completed',0.0,'standard',1,'高质量开户','2026-03-21 06:30:06','2026-03-21 06:30:06',1);
INSERT INTO referrals VALUES(5,'2026-03-21','市拓条线','谢文强','公司条线','廖灵通','深圳市吉昌盛电路技术有限公司','pending',0.0,'standard',0,'高质量、授信','2026-03-21 07:52:30','2026-03-21 07:52:30',1);
INSERT INTO referrals VALUES(6,'2026-04-22','理财条线','武孝龙','公司条线','陈喆','私募投资人赵总','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(7,'2026-04-21','公司条线','徐嘉蔚','市拓条线','谢文强','奥斯特电气','completed',0.0,'standard',0,'21户有效户','2026-05-06 13:42:51','2026-05-20 20:02:02',0);
INSERT INTO referrals VALUES(8,'2026-04-16','公司条线','张祥霖','市拓条线','谢文强','深圳市恒之易电子商务有限公司','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(9,'2026-04-13','公司条线','张祥霖','理财条线','魏小栋','维力谷吕总金葵花','completed',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-14 00:36:35',0);
INSERT INTO referrals VALUES(10,'2026-04-13','理财条线','魏小栋','公司条线','张祥霖','深圳市振成建筑工程有限公司','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(11,'2026-04-08','理财条线','武孝龙','公司条线','林玉婵','倍贺科技','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(12,'2026-04-07','理财条线','魏小栋','公司条线','吴逸辉','翱鹰航空','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-13 08:03:01',1);
INSERT INTO referrals VALUES(13,'2026-04-01','理财条线','明行','公司条线','吴逸辉','德龙包装','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-13 08:00:51',1);
INSERT INTO referrals VALUES(14,'2026-04-01','理财条线','魏小栋','公司条线','吴逸辉','富友鹏投资集团','completed',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-13 08:03:16',0);
INSERT INTO referrals VALUES(15,'2026-03-26','理财条线','武孝龙','公司条线','李紫茹','深圳收租大户','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(16,'2026-03-25','理财条线','程方正','公司条线','冯志翔','深圳华住酒店客户','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(17,'2026-03-20','市拓条线','鄢奥成','市拓条线','谢文强','深圳市芯睿视科技有限公司','completed',0.0,'standard',0,'举办下午茶活动','2026-05-06 13:42:51','2026-05-13 08:11:50',0);
INSERT INTO referrals VALUES(18,'2026-03-18','理财条线','武孝龙','公司条线','吴逸辉','高质量线索刘总','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(19,'2026-03-12','市拓条线','谢文强','公司条线','张祥霖','华安芯（深圳）科技有限公司','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(20,'2026-03-10','理财条线','武孝龙','公司条线','林玉婵','深圳市新鑶网络技术有限公司','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(21,'2026-03-03','公司条线','张祥霖','理财条线','魏小栋','一户金葵花','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(22,'2026-02-26','市拓条线','谢文强','市拓条线','林玉婵','深圳市福瑞诺科技有限公司','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(23,'2026-02-25','市拓条线','谢文强','公司条线','林玉婵','深圳市鑫梓润股份有限公司','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(24,'2026-02-05','理财条线','武孝龙','公司条线','李紫茹','合肥磐芯电子有限公司','invalid',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(25,'2026-01-30','理财条线','王菲菲','公司条线','李紫茹','医承教育','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(26,'2026-01-30','理财条线','程方正','公司条线','李紫茹','科创企业鸿瑞德','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(27,'2026-01-27','理财条线','王菲菲','公司条线','李紫茹','欣睿电子','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(28,'2026-01-26','市拓条线','谢文强','公司条线','李紫茹','政采贷、招捷贷目标客户绿清生活','invalid',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(29,'2026-01-26','公司条线','冯志翔','理财条线','武孝龙','公司客户了解境外美元理财','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(30,'2026-01-23','理财条线','武孝龙','公司条线','李紫茹','优质企业智迅加科技','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(31,'2026-01-23','公司条线','马芷晴','理财条线','程方正','陈总升级金葵花卡','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(32,'2026-01-23','公司条线','吴逸辉','理财条线','杨思娴','宝石角老板尹总金葵花转归属','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(33,'2026-01-20','理财条线','武孝龙','公司条线','李紫茹','方亭供应链','completed',0.0,'standard',1,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(34,'2026-01-15','理财条线','武孝龙','公司条线','张祥霖','搏凯电子','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(35,'2026-01-14','公司条线','林玉婵','理财条线','武孝龙','优质夫妻客户今天开立金葵花卡','pending',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-06 13:42:51',1);
INSERT INTO referrals VALUES(36,'2026-01-12','理财条线','程方正','公司条线','冯志翔','优质华住集团渠道','invalid',0.0,'standard',0,'','2026-05-06 13:42:51','2026-05-13 09:27:00',1);
INSERT INTO referrals VALUES(37,'2026-05-11','公司条线','吴逸辉','理财条线','武孝龙','张姐','completed',0.0,'standard',0,'跟进配置理财基金产品，有希望到M3，已转资金到M3','2026-05-13 07:48:48','2026-05-20 12:52:31',0);
INSERT INTO referrals VALUES(38,'2026-04-28','市拓条线','谢文强','公司条线','张祥霖','宇天汛通讯科技（深圳）有限公司','pending',0.0,'standard',0,'跟进开户','2026-05-13 07:50:39','2026-05-13 07:50:39',1);
INSERT INTO referrals VALUES(39,'2026-04-24','公司条线','陈喆','理财条线','武孝龙','H股拟上市公司HF技术核心股东黄总','pending',0.0,'standard',0,'同意转归属','2026-05-13 07:59:34','2026-05-13 07:59:34',0);
INSERT INTO referrals VALUES(40,'2026-05-12','市拓条线','谢文强','公司条线','徐嘉蔚','深圳市科沃尔国际供应链有限公司','pending',0.0,'standard',0,'基本户变更完就可以开','2026-05-13 09:24:22','2026-05-13 09:24:22',1);
INSERT INTO referrals VALUES(41,'2026-05-15','理财条线','武孝龙','公司条线','吴逸辉','国绿特','pending',0.0,'standard',0,'','2026-05-20 12:49:25','2026-05-20 12:49:25',1);
INSERT INTO referrals VALUES(42,'2026-05-15','理财条线','武孝龙','公司条线','吴逸辉','深圳市鼎盛多层电子有限公司','pending',0.0,'standard',0,'已交资料，下周开卡','2026-05-20 12:50:33','2026-05-20 12:50:33',1);
INSERT INTO referrals VALUES(43,'2026-05-15','理财条线','魏小栋','公司条线','张祥霖','芯华能电子科技','pending',0.0,'standard',0,'泰和源约上门拜访','2026-05-20 12:51:45','2026-05-20 12:51:45',1);
INSERT INTO referrals VALUES(44,'2026-05-19','公司条线','林玉婵','市拓条线','谢文强','南充鼎鑫劳务有限公司深圳分公司','pending',0.0,'standard',0,'20多人代发','2026-05-20 12:53:56','2026-05-20 12:53:56',1);
INSERT INTO referrals VALUES(45,'2026-05-20','公司条线','张祥霖','市拓条线','谢文强','广东建华盛建设工程有限公司','pending',0.0,'standard',0,'','2026-05-20 12:56:53','2026-05-20 12:56:53',1);
INSERT INTO referrals VALUES(46,'2026-05-06','理财条线','程方正','市拓条线','谢文强','深圳市万波丽景酒店管理有限公司','completed',0.0,'standard',0,'34户代发有效户','2026-05-20 20:01:30','2026-05-20 20:01:30',0);
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
INSERT INTO follow_ups VALUES(10,29,'2026-05-13','am','电话','下月约访网点见面',NULL,'','2026-05-18 00:42:44');
INSERT INTO follow_ups VALUES(11,17,'2026-05-15','am','电话','咨询代发',NULL,'','2026-05-18 00:58:04');
INSERT INTO follow_ups VALUES(12,21,'2026-05-14','am','电话','集团和工程公司开户',NULL,'','2026-05-18 01:00:18');
INSERT INTO follow_ups VALUES(13,86,'2026-05-15','am','电话','深圳和韶关公司开户',NULL,'','2026-05-18 01:00:38');
INSERT INTO follow_ups VALUES(14,14,'2026-05-14','am','电话','预计7月落地',NULL,'','2026-05-18 01:58:57');
INSERT INTO follow_ups VALUES(15,88,'2026-05-29','pm','电话','网点见关键人刘小燕，公司目前无授信需求，主要深圳公司没资质也不好批，刘晓燕对礼品比较敏感，薪福通讲了还在消化中',NULL,'','2026-05-29 20:38:14');
INSERT INTO follow_ups VALUES(16,16,'2026-05-29','am','电话','授信放款接触，代发难度还是较大，再继续约活动中',NULL,'','2026-05-29 20:39:06');
INSERT INTO follow_ups VALUES(17,86,'2026-05-29','am','电话','已经领完资料',NULL,'','2026-05-29 20:39:36');
INSERT INTO follow_ups VALUES(18,13,'2026-05-25','am','电话','老板骨折在家',NULL,'','2026-05-29 20:40:11');
INSERT INTO follow_ups VALUES(19,21,'2026-05-28','am','电话','配置了考勤机待测试，下周跟进领账户资料',NULL,'','2026-05-29 20:40:54');
INSERT INTO follow_ups VALUES(20,90,'2026-05-25','am','电话','开户中，有经营贷需求',NULL,'','2026-05-29 20:42:07');
INSERT INTO follow_ups VALUES(21,19,'2026-05-25','am','电话','约访范总',NULL,'','2026-05-29 21:26:21');
CREATE TABLE xinfutong (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          loan_amount REAL,
          loan_term INTEGER,
          interest_rate REAL,
          status TEXT DEFAULT '申请中',
          apply_date DATETIME,
          approve_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );
CREATE TABLE fusion_targets (id INTEGER PRIMARY KEY AUTOINCREMENT, manager_name VARCHAR(50) NOT NULL, task_category VARCHAR(50) NOT NULL, target_type VARCHAR(30) NOT NULL, line VARCHAR(20) NOT NULL, task_count INTEGER DEFAULT 0, completed_count INTEGER DEFAULT 0, target_companies TEXT, potential_companies TEXT, follow_record TEXT, linked_marketing_task_id INTEGER, status VARCHAR(20) DEFAULT '进行中', open_red_task INTEGER DEFAULT 0, open_red_completed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, target_company VARCHAR(100), contact_manager VARCHAR(50), follow_type VARCHAR(20));
INSERT INTO fusion_targets VALUES(34,'武孝龙','C2B高质量开户','C2B高质量开户','批发',6,3,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(35,'程方正','C2B高质量开户','C2B高质量开户','批发',5,1,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(36,'杨思娴','C2B高质量开户','C2B高质量开户','批发',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(37,'魏小栋','C2B高质量开户','C2B高质量开户','批发',2,2,NULL,NULL,'',NULL,'已完成',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(39,'程方正','C2B授信','C2B授信','批发',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(40,'陈喆','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(41,'林玉婵','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(42,'冯志翔','B2C保险','B2C保险','零售',2,1,NULL,NULL,'委任为吧',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-30 12:24:30','刘总','武孝龙',NULL);
INSERT INTO fusion_targets VALUES(43,'鄢奥成','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(44,'徐嘉蔚','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(45,'李紫茹','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(46,'吴逸辉','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-30 03:57:56','',NULL,NULL);
INSERT INTO fusion_targets VALUES(47,'张翔霖','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(48,'唐菁菁','B2C保险','B2C保险','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(49,'陈喆','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(50,'林玉婵','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(51,'冯志翔','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(52,'鄢奥成','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(53,'徐嘉蔚','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(54,'李紫茹','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(55,'吴逸辉','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(56,'张翔霖','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(57,'唐菁菁','B2C小微贷','B2C小微贷','零售',2,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(58,'陈喆','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(59,'林玉婵','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(60,'冯志翔','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(61,'鄢奥成','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(62,'徐嘉蔚','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(63,'李紫茹','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(64,'吴逸辉','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(65,'张翔霖','B2C百人代发','B2C百人代发','零售',1,1,NULL,NULL,'',NULL,'已完成',0,0,'2026-05-29 23:08:56','2026-05-30 12:10:48','深圳市恒之易电子商务有限公司',NULL,NULL);
INSERT INTO fusion_targets VALUES(66,'唐菁菁','B2C百人代发','B2C百人代发','零售',1,0,NULL,NULL,'',NULL,'进行中',0,0,'2026-05-29 23:08:56','2026-05-29 23:08:56',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(67,'冯志翔','B2C保险','B2C保险','零售',0,0,'',NULL,'的撒法的路上看见法律阿达离开房间啊领导；的数据库',NULL,'进行中',0,0,'2026-05-30 02:47:48','2026-05-30 13:09:29','王总',NULL,'phone');
INSERT INTO fusion_targets VALUES(68,'冯志翔','B2C保险','B2C保险','零售',0,0,'',NULL,'',NULL,'进行中',0,0,'2026-05-30 02:48:50','2026-05-30 12:09:22','谢总',NULL,NULL);
INSERT INTO fusion_targets VALUES(70,'冯志翔','B2C保险','B2C保险','零售',0,0,'',NULL,'',NULL,'进行中',0,0,'2026-05-30 02:59:24','2026-05-30 02:59:24',NULL,NULL,NULL);
INSERT INTO fusion_targets VALUES(71,'冯志翔','B2C保险','B2C保险','零售',0,0,'',NULL,'',NULL,'进行中',0,0,'2026-05-30 02:59:47','2026-05-30 02:59:47',NULL,NULL,NULL);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('companies',90);
INSERT INTO sqlite_sequence VALUES('users',1);
INSERT INTO sqlite_sequence VALUES('contacts',15);
INSERT INTO sqlite_sequence VALUES('marketing_tasks',6);
INSERT INTO sqlite_sequence VALUES('week_tasks',50);
INSERT INTO sqlite_sequence VALUES('xinfutong_details',6);
INSERT INTO sqlite_sequence VALUES('lead_boards',6);
INSERT INTO sqlite_sequence VALUES('leads',52);
INSERT INTO sqlite_sequence VALUES('referrals',46);
INSERT INTO sqlite_sequence VALUES('follow_ups',21);
INSERT INTO sqlite_sequence VALUES('fusion_targets',105);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_marketing_company ON marketing_progress(company_id);
CREATE INDEX idx_reminders_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_contact ON reminders(contact_id);
CREATE INDEX idx_follow_ups_company ON follow_ups(company_id);
CREATE INDEX idx_week_tasks_company ON week_tasks(company_id);
CREATE INDEX idx_xinfutong_company ON xinfutong(company_id);
CREATE INDEX idx_referrals_date ON referrals(referral_date);
CREATE INDEX idx_referrals_from ON referrals(from_person);
CREATE INDEX idx_referrals_to ON referrals(to_person);
CREATE INDEX idx_referrals_status ON referrals(business_status);
CREATE INDEX idx_leads_manager ON leads(manager_name);
CREATE INDEX idx_leads_visited ON leads(is_visited);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_board ON leads(board_id);
CREATE INDEX idx_leads_daily_deposit ON leads(daily_deposit);
CREATE INDEX idx_leads_credit ON leads(credit_exposure);
CREATE INDEX idx_fusion_targets_manager ON fusion_targets(manager_name);
CREATE INDEX idx_fusion_targets_type ON fusion_targets(target_type);
COMMIT;
