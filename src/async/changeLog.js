import { pool } from '../server';
import addWeeks from 'date-fns/addWeeks';
import format from 'date-fns/format';
import isValid from 'date-fns/isValid';
import { omitBy, isEmpty } from 'lodash';
import addressAsync from './addresses';

class ChangeLogAsync {
  async addAddressChangeLog (address, operation, recordId) {
    const skip = ['create_date', 'create_user', 'update_date', 'update_user'];
    if (!address) throw new Error('address is required');

    const tableName = 'addresses';
    const id = operation === 'insert' ? recordId : address.id;
    const userid = operation === 'insert' ? address.create_user : address.update_user;
    const changes = {};

    if (operation === 'insert') {
      changes.added = true;
    } else if (operation === 'delete') {
      changes.removed = true;
    } else {
      // get existing address first
      const oldAddress = await addressAsync.getAddress(id, '*');
      const rawChanges = omitBy(address, (value, key) => oldAddress[key] == value);
      for (const key in rawChanges) {
        if (!skip.includes(key)) {
          changes[key] = { new: rawChanges[key], old: oldAddress[key] };
        }
      }
    }

    if (isEmpty(changes)) return null;

    const sql = `INSERT INTO changelog (publisher_id, table_name, record_id, changes) VALUES (?, ?, ?, ?)`;
    const values = [userid, tableName, id, JSON.stringify(changes)];
    const result = await pool.query(sql, values);
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
      idClause = congId ? `a.congregationid=${congId}` : '';
    } else {
      idClause = recordId ? `(cl.record_id=${recordId} OR a.parent_id=${recordId})` : '';
    }

    const pubClause = publisherId ? ` AND cl.publisher_id=${publisherId}` : '';

    // Apply minDate filter only when there is no recordId or publisherId passed.
    // This allows users to query for all records for a given address or publisher.
    const dateClause = recordId || publisherId ? '' : ` AND cl.date >= '${minDate}'`;

    const result = await pool.query(`
      SELECT * FROM address_changelog cl
      JOIN addresses a ON cl.record_id = a.id
      WHERE ${idClause}${pubClause}${dateClause}
    `);

    return result;
  }
}

export default new ChangeLogAsync();
