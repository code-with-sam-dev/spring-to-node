import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

// EPISODE 19 PROBE, C: one Postgres container for the whole run, handed to every file.
let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:18-alpine').start();
  project.provide('pgUri', container.getConnectionUri());
}

export async function teardown() {
  await container.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    pgUri: string;
  }
}
