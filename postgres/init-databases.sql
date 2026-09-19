-- Two applications, two databases.
--
-- WHY, and it cost a debugging session on 2026-09-19 to learn it properly:
-- both stacks were originally pointed at one `payments` table with Hibernate's
-- ddl-auto and TypeORM's synchronize both managing the schema. Hibernate
-- created `amount_in_minor_units`; TypeORM created `amountInMinorUnits`. Each
-- inserted into its own column and left the other NULL, and Postgres rejected
-- the row with 23502, a not-null violation.
--
-- TWO ORMs MANAGING ONE TABLE IS NOT A COMPARISON, IT IS A COLLISION. The
-- video compares the two stacks doing the SAME job independently, so they get
-- the same schema shape in separate databases and neither can corrupt the
-- other's run.
CREATE DATABASE payments_spring;
CREATE DATABASE payments_node;
GRANT ALL PRIVILEGES ON DATABASE payments_spring TO payments;
GRANT ALL PRIVILEGES ON DATABASE payments_node TO payments;
