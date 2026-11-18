import { setStatementTimeoutOnConnections } from 'src/database/typeorm/utils/set-statement-timeout-on-connections.util';

const installOnDriver = (connection: { query: jest.Mock }) => {
  const releaseConnection = jest.fn();
  const driver = {
    obtainMasterConnection: jest
      .fn()
      .mockResolvedValue([connection, releaseConnection]),
  };

  setStatementTimeoutOnConnections({ driver, statementTimeoutMs: 10000 });

  return { driver, releaseConnection };
};

describe('setStatementTimeoutOnConnections', () => {
  it('should set the statement timeout once per connection', async () => {
    const connection = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const { driver, releaseConnection } = installOnDriver(connection);

    await driver.obtainMasterConnection();
    await driver.obtainMasterConnection();

    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenCalledWith(
      `SELECT set_config('statement_timeout', $1, false)`,
      ['10000'],
    );
    expect(releaseConnection).not.toHaveBeenCalled();
  });

  it('should destroy the connection and rethrow when the statement timeout cannot be set', async () => {
    const queryError = new Error('Query read timeout');
    const connection = { query: jest.fn().mockRejectedValue(queryError) };
    const { driver, releaseConnection } = installOnDriver(connection);

    await expect(driver.obtainMasterConnection()).rejects.toBe(queryError);

    expect(releaseConnection).toHaveBeenCalledTimes(1);
    expect(releaseConnection).toHaveBeenCalledWith(queryError);
  });
});
