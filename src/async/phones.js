import { get } from 'lodash';
import { escape } from 'mysql';
import { pool } from '../server';
import changeLogAsync from './changeLog';

class PhonesAsync {
  constructor() {
    this.aliases = `
      congregationid as congregationId,
      create_user as create_username,
      update_user as update_username
    `;
  }

  async getPhone (id, status = 'Active') {
    const statusCondition = status === '*' ? '' : ` AND status='${status}'`;
    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE id=${id}${statusCondition}`;
    return (await pool.query(sql))[0];
  }

  async getPhones (parentId, terrId, status = 'Active') {
    const statusCondition = 
      status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const parentCondition = parentId ? ` AND parent_id=${parentId}` : '';
    const terrCondition = terrId ? ` AND territory_id=${terrId}` : '';

    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE type='Phone'${parentCondition}${terrCondition}${statusCondition}`;

    return await pool.query(sql);
  }

  async searchPhones (congId, keyword, status = 'Active') {
    if (!congId || !keyword) {
      return [];
    }

    const statusCondition = status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const sql = `SELECT *, ${this.aliases} FROM addresses 
    WHERE type='Phone' AND congregationid=${congId}${statusCondition} AND phone LIKE '%${keyword}%'`;
    return await pool.query(sql);
  }

  async getDNC (congId) {
    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE type='Phone' AND congregationid=${congId} AND status='DNC'`;
    return await pool.query(sql);
  }

  async create (phone) {
    if (!phone.congregationId) {
      throw new Error('congregation id is required');
    }

    const results = await pool.query(`INSERT INTO addresses (
      congregationid,
      territory_id,
      parent_id,
      type,
      status,
      sort,
      addr1,
      addr2,
      city,
      state_province,
      postal_code,
      phone,
      longitude,
      latitude,
      notes,
      create_user,
      create_date
    ) VALUES (
      ${ get(phone, 'congregationId', '') },
      ${ get(phone, 'territory_id', '') },
      ${ get(phone, 'parent_id', '') },
      'Phone',
      ${ escape(get(phone, 'status')) || 'Active' },
      ${ get(phone, 'sort', '') },
      ${ escape(get(phone, 'addr1')) || '' },
      ${ escape(get(phone, 'addr2')) || '' },
      ${ escape(get(phone, 'city')) || '' },
      ${ escape(get(phone, 'state_province')) || '' },
      ${ escape(get(phone, 'postal_code')) || '' },
      ${ escape(get(phone, 'phone')) || '' },
      ${ get(phone, 'longitude', 'NULL') },
      ${ get(phone, 'latitude', 'NULL') },
      ${ escape(get(phone, 'notes')) || '' },
      ${ get(phone, 'create_user', '') },
      NOW()
    )`);

    await changeLogAsync.addAddressChangeLog(phone, 'insert', results.insertId);

    return results.insertId;
  }

  async update (phone) {
    if (!(phone && phone.id)) {
      throw new Error('Phone id is required');
    }

    const sql = `UPDATE addresses SET
      congregationid = ${get(phone, 'congregationId', '')},
      territory_id = ${get(phone, 'territory_id', '')},
      parent_id = ${get(phone, 'parent_id', '')},
      status = ${escape(get(phone, 'status')) || ''},
      sort = ${get(phone, 'sort', '')},
      addr1 = ${escape(get(phone, 'addr1')) || ''},
      addr2 = ${escape(get(phone, 'addr2')) || ''},
      city = ${escape(get(phone, 'city')) || ''},
      state_province = ${escape(get(phone, 'state_province')) || ''},
      postal_code = ${escape(get(phone, 'postal_code')) || ''},
      phone = ${escape(get(phone, 'phone')) || ''},
      longitude = ${get(phone, 'longitude', 'NULL')},
      latitude = ${get(phone, 'latitude', 'NULL')},
      update_user = ${get(phone, 'update_user', '')},
      update_date = NOW(),
      notes = ${escape(get(phone, 'notes')) || ''}
    WHERE id = ${get(phone, 'id', '')}`;

    await changeLogAsync.addAddressChangeLog(phone);
    await pool.query(sql);
  }

  async changeStatus (id, status, userid, notes) {
    if (!id) throw new Error('id is required');
    if (!status) throw new Error('status is required');
    if (!userid) throw new Error('userid is required');

    const sql = `UPDATE addresses SET 
      status = ${escape(status)}, update_user = ${userid}, notes = ${escape(notes)}
      WHERE id=${id}`;

    await changeLogAsync.addAddressChangeLog({ id, update_user: userid, status, notes });
    await pool.query(sql);
  }

  async updateSort (id, sort, userid) {
    if (!id) throw new Error('id is required');
    if (!sort) throw new Error('sort is required');
    if (!userid) throw new Error('userid is required');

    const sql = `UPDATE addresses SET 
      sort = ${sort} WHERE id=${id}`;

    await changeLogAsync.addAddressChangeLog({ id, update_user: userid, sort });
    await conn.query(sql);
  }

  async searchPhones (congId, phone, status = 'Active') {
    if (!congId || !phone) {
      return [];
    }

    const statusCondition = status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const sql = `SELECT *, ${this.aliases} FROM addresses 
      WHERE type = 'Phone' AND congregationid=${congId}${statusCondition}
      AND (phone LIKE '%${phone}%' OR notes LIKE '%${phone}%')`;
    return await conn.query(sql);
  }
}


export default new PhonesAsync();
