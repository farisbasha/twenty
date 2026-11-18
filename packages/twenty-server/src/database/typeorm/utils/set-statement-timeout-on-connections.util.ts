import { type PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

export const setStatementTimeoutOnConnections = ({
  driver,
  statementTimeoutMs,
}: {
  driver: Pick<PostgresDriver, 'obtainMasterConnection'>;
  statementTimeoutMs: number;
}): void => {
  const obtainMasterConnection = driver.obtainMasterConnection.bind(driver);
  const configuredConnections = new WeakSet<object>();

  driver.obtainMasterConnection = async () => {
    const [connection, releaseConnection] = await obtainMasterConnection();

    if (configuredConnections.has(connection)) {
      return [connection, releaseConnection];
    }

    try {
      await connection.query(
        `SELECT set_config('statement_timeout', $1, false)`,
        [String(statementTimeoutMs)],
      );
    } catch (error) {
      releaseConnection(error);

      throw error;
    }

    configuredConnections.add(connection);

    return [connection, releaseConnection];
  };
};
