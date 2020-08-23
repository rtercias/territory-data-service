import { conn } from '../server';
import addMonths from 'date-fns/addMonths';
import format from 'date-fns/format';
import { omitBy, isEmpty } from 'lodash';
import addressAsync from './addresses';

class ChangeLogAsync {
  async addAddressChangeLog (updatedAddress) {
    if (!updatedAddress) throw new Error('updatedAddress is required');

    // get existing address first
    const { id, update_user: userid } = updatedAddress;
    const oldAddress = await addressAsync.getAddress(id, '*');
    const rawChanges = omitBy(updatedAddress, (value, key) => oldAddress[key] == value);
    const changes = {};
    for (const key in rawChanges) {
      changes[key] = { new: rawChanges[key], old: oldAddress[key] };
    }

    if (isEmpty(changes)) return null;

    const sql = `INSERT INTO changelog (publisher_id, table_name, record_id, changes) VALUES (?, ?, ?, ?)`;
    const values = [userid, 'addresses', id, JSON.stringify(changes)];
    const result = await conn.query(sql, values);
    result.insertId;
  }

  async read (tableName, recordId, minDate) {
    if (!tableName) throw new Error('table name is required');
    if (!recordId) throw new Error('record id is required');
    if (!minDate) minDate = addMonths(new Date(), -2);
    const result = await conn.query(`
      SELECT * FROM changelog
      WHERE table_name='${tableName}' AND record_id=${recordId} AND date >= '${format(minDate, 'yyyy-MM-dd pp')}'
    `);

    return result;
  }
}

export default new ChangeLogAsync();
