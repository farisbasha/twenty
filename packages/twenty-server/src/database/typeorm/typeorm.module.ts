import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource, type DataSourceOptions } from 'typeorm';
import { type PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

import {
  primaryDatabaseTimeoutMs,
  typeORMCoreModuleOptions,
} from 'src/database/typeorm/core/core.datasource';
import { DatabaseGaugeService } from 'src/database/typeorm/database-gauge.service';
import { DatabasePoolMetricsService } from 'src/database/typeorm/database-pool-metrics.service';
import { PostgresAdvisoryLockService } from 'src/database/typeorm/postgres-advisory-lock.service';
import { destroyConnectionsReleasedMidQuery } from 'src/database/typeorm/utils/destroy-connections-released-mid-query.util';
import { setStatementTimeoutOnConnections } from 'src/database/typeorm/utils/set-statement-timeout-on-connections.util';
import { MetricsModule } from 'src/engine/core-modules/metrics/metrics.module';
import { installUpgradeAwareRepositoryProxy } from 'src/engine/twenty-orm/upgrade-aware/install-upgrade-aware-repository-proxy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => typeORMCoreModuleOptions,
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options as DataSourceOptions);

        await dataSource.initialize();

        const driver = dataSource.driver as PostgresDriver;

        destroyConnectionsReleasedMidQuery(driver);
        setStatementTimeoutOnConnections({
          driver,
          statementTimeoutMs: primaryDatabaseTimeoutMs,
        });
        installUpgradeAwareRepositoryProxy(dataSource);

        return dataSource;
      },
    }),
    MetricsModule,
  ],
  providers: [
    DatabasePoolMetricsService,
    DatabaseGaugeService,
    PostgresAdvisoryLockService,
  ],
  exports: [DatabasePoolMetricsService, PostgresAdvisoryLockService],
})
export class TypeORMModule {}
