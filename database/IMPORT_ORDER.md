# 数据库导入顺序

1. `01_schema.sql`
   - 创建数据库 `campus_activity_db`
   - 创建 7 张数据表、主键、外键和索引

2. `02_seed.sql`
   - 插入学生、管理员、社团、场地、分类、活动、报名、通知等演示数据

3. `03_triggers.sql`
   - 创建报名添加触发器 `trg_before_registration_insert`

4. `04_procedures.sql`
   - 创建活动结算存储过程 `sp_finish_activity`

5. `05_views.sql`
   - 创建活动统计视图 `v_activity_summary`

注意：导入时只需要执行以上 5 个 SQL 文件。若演示过程中数据被改乱，可以从 `01_schema.sql` 重新按顺序导入。
