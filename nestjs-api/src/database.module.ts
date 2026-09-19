import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './payments/payment.entity.js';

// The Spring equivalent of this whole file is four lines in application.yml and
// a starter on the classpath. Nest makes the wiring explicit, which is more
// typing and considerably less mystery: you can SEE where the connection comes
// from and when it is created.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(config.get<string>('DATABASE_PORT', '5432')),
        username: config.get<string>('DATABASE_USER', 'payments'),
        password: config.get<string>('DATABASE_PASSWORD', 'payments'),
        database: config.get<string>('DATABASE_NAME', 'payments_node'),
        entities: [PaymentEntity],
        // synchronize is a DEVELOPMENT convenience and the episode says so out
        // loud. It is the rough equivalent of ddl-auto: update, and it carries
        // the same warning: never in production, use migrations.
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
