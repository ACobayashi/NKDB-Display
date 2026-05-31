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

## 四、演示顺序

建议答辩时按这个顺序演示：

1. 打开页面，说明系统已连接 MySQL。
2. 展示“活动统计视图”，说明数据来自 `v_activity_summary`。
3. 点击“触发器控制的报名添加”的成功案例。
4. 点击“满员失败案例”或“重复报名失败案例”，说明触发器阻止非法插入。
5. 点击“存储过程控制的积分结算”的成功案例，说明学生积分和活动状态被更新。
6. 再次结算同一个活动，说明存储过程阻止重复加分。
7. 选择活动 2，点击“事务删除”，说明系统按顺序删除通知、报名记录和活动主体，并使用事务保证一致性。

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
