import { conn } from '../server';
import addWeeks from 'date-fns/addWeeks';
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

  async getAddressChangeLog (congId, recordId, minDate) {
    if (!congId && !recordId) throw new Error('One of congId or recordId is required');

    if (!minDate) {
      minDate = format(addWeeks(new Date(), -1), 'yyyy-MM-dd pp');
    }

    let idClause = '';
    if (!recordId) {
      idClause = congId ? `congregationid=${congId}` : '';
    } else {
      idClause = recordId ? `record_id=${recordId}` : '';
    }

    const result = await conn.query(`
      SELECT * FROM address_changelog
      WHERE ${idClause} AND date >= '${minDate}'
    `);

    return result;
  }
}

export default new ChangeLogAsync();
