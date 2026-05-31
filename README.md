# 校园活动报名与积分管理系统

这是数据库工程课程作业演示项目，主题为“校园活动报名与积分管理系统”。项目重点覆盖报告评分项中的四类数据库操作：

- 含有事务应用的删除操作：删除活动，同时删除通知和报名记录，使用 `BEGIN / COMMIT / ROLLBACK`
- 触发器控制下的添加操作：学生报名活动，由 `BEFORE INSERT` 触发器检查重复报名、活动容量和报名截止时间
- 存储过程控制下的更新操作：活动结算时批量更新学生积分、报名状态和活动状态
- 含有视图的查询操作：使用 `v_activity_summary` 查询活动统计信息

## 一、必备环境

- macOS
- MySQL Community Server 8.x
- MySQL Workbench
- Node.js LTS

MySQL Community Server 是免费的，本项目不需要 MySQL HeatWave、OCI 或 AWS 云服务。

## 二、导入数据库

在 MySQL Workbench 中连接本地 MySQL，然后按顺序打开并执行以下 SQL 文件：

1. `database/01_schema.sql`
2. `database/02_seed.sql`
3. `database/03_triggers.sql`
4. `database/04_procedures.sql`
5. `database/05_views.sql`

执行完成后可以运行：

```sql
USE campus_activity_db;
SELECT * FROM v_activity_summary;
```

如果能看到活动统计数据，说明数据库导入成功。

## 三、启动项目

进入后端目录并安装依赖：

```bash
cd /Users/akobayashi/Database/campus-activity-db/server
npm install
```

复制环境变量文件：

```bash
cp .env.example .env
```

打开 `server/.env`，把 `DB_PASSWORD` 改成你安装 MySQL 时设置的 root 密码。

启动系统：

```bash
npm start
```

浏览器打开：

```text
http://localhost:3000
```


## 四、答辩点击路线

页面入口按真实管理工具命名。答辩时可以按下面顺序点击，并说明背后的数据库评分点：

1. 打开页面，说明系统已连接 MySQL。
2. 点击“活动总览”，说明数据来自视图 `v_activity_summary`。
3. 可在“新增学生成员”中添加或删除一名学生，说明系统具备基础数据维护能力；删除成员时会同步清理该学生报名记录。
4. 可在“新增校园活动”发布一条活动，说明系统支持活动发布和报名流程衔接。
5. 在“活动报名办理”选择学生和活动，点击“提交报名”，说明新增报名由触发器 `trg_before_registration_insert` 校验。
6. 再尝试选择满员活动或重复报名组合，说明触发器阻止非法插入。
7. 在“活动积分结算”选择五月数据库实践工作坊，点击“执行结算”，说明存储过程 `sp_finish_activity` 批量更新积分、报名状态和活动状态。
8. 再次结算同一个活动，说明存储过程阻止重复加分。
9. 在“活动数据删除”选择活动，点击“删除活动”，说明后端使用 `BEGIN / COMMIT / ROLLBACK` 保证活动、报名和通知一起删除。

## 五、文件树

```text
campus-activity-db/
├── README.md
├── database/
│   ├── 01_schema.sql
│   ├── 02_seed.sql
│   ├── 03_triggers.sql
│   ├── 04_procedures.sql
│   ├── 05_views.sql
│   └── 06_demo_queries.sql
├── report/
│   ├── REPORT_DRAFT.md
│   ├── 数据库工程作业报告_填写稿.docx
│   ├── scripts/
│   │   └── make_report_docx.py
│   └── screenshots/
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js
│       └── db.js
└── web/
    ├── index.html
    ├── styles.css
    └── app.js
```
