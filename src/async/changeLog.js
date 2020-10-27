import { conn } from '../server';
import addWeeks from 'date-fns/addWeeks';
import format from 'date-fns/format';
import isValid from 'date-fns/isValid';
import { omitBy, isEmpty } from 'lodash';
import addressAsync from './addresses';

class ChangeLogAsync {
  async addAddressChangeLog (updatedAddress) {
    const skip = ['create_date'];
    if (!updatedAddress) throw new Error('updatedAddress is required');

    // get existing address first
    const { id, update_user: userid } = updatedAddress;
    const oldAddress = await addressAsync.getAddress(id, '*');
    const rawChanges = omitBy(updatedAddress, (value, key) => oldAddress[key] == value);
    const changes = {};
    for (const key in rawChanges) {
      if (!skip.includes(key)) {
        changes[key] = { new: rawChanges[key], old: oldAddress[key] };
      }
    }

    if (isEmpty(changes)) return null;

    const sql = `INSERT INTO changelog (publisher_id, table_name, record_id, changes) VALUES (?, ?, ?, ?)`;
    const values = [userid, 'addresses', id, JSON.stringify(changes)];
    const result = await conn.query(sql, values);
    result.insertId;
  }

  async getAddressChangeLog (congId, recordId, minDate, publisherId) {
    if (!congId && !recordId) throw new Error('One of congId or recordId is required');

    if (!minDate) {
      minDate = format(addWeeks(new Date(), -1), 'yyyy-MM-dd pp');
    }

    if (!isValid(new Date(minDate))) {
      throw new Error(`${minDate} is not a valid date`);
    }

    let idClause = '';
    if (!recordId) {
      idClause = congId ? `congregationid=${congId}` : '';
    } else {
      idClause = recordId ? `record_id=${recordId}` : '';
    }

    const pubClause = publisherId ? ` AND publisher_id=${publisherId}` : '';

    // Apply minDate filter only when there is no recordId or publisherId passed.
    // This allows users to query for all records for a given address or publisher.
    const dateClause = recordId || publisherId ? '' : ` AND date >= '${minDate}'`;

    const result = await conn.query(`
      SELECT * FROM address_changelog
      WHERE ${idClause}${pubClause}${dateClause}
    `);

    return result;
  }
}

export default new ChangeLogAsync();
