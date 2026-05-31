# 数据库导入顺序

在 MySQL Workbench 中按顺序执行：

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

6. `06_demo_queries.sql`
   - 可选，只用于单独在 Workbench 里测试成功/失败案例

注意：`06_demo_queries.sql` 会修改演示数据，正式演示前如果数据乱了，可以从 `01_schema.sql` 重新按顺序导入。
