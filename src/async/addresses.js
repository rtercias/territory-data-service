import { ApolloError } from 'apollo-server-express';
import { get } from 'lodash';
import { escape } from 'mysql';
import { pool } from '../server';
import changeLogAsync from './changeLog';

class AddressAsync {
  constructor() {
    this.aliases = `
      congregationid as congregationId,
      create_user as create_username,
      update_user as update_username
    `;
  }

  async getAddress (id, status = 'Active') {
    const statusCondition = status === '*' ? '' : ` AND status='${status}'`;
    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE id=${id}${statusCondition}`;
    const result = await pool.query(sql);
    return result[0];
  }

  async getAddressesByTerritory (terrId, status = 'Active') {
    const statusCondition = 
      status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE type='Regular' AND territory_id=${terrId}${statusCondition}`;

    return await pool.query(sql);
  }

  async searchAddresses (congId, keyword, status = 'Active') {
    if (!congId || !keyword) {
      return [];
    }

    const statusCondition = status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const sql = `SELECT *, ${this.aliases} FROM addresses 
    WHERE type='Regular' AND congregationid=${congId}${statusCondition}
    AND (addr1 LIKE '%${keyword}%' OR addr2 LIKE '%${keyword}%' OR notes LIKE '%${keyword}%')`;
    return await pool.query(sql);
  }

  async getDNC (congId, keyword) {
    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE type='Regular'
      AND congregationid=${congId} AND status='DNC'
      AND (addr1 LIKE '%${keyword}%' OR addr2 LIKE '%${keyword}%')`;

    return await pool.query(sql);
  }

  async create (address) {
    if (!address.congregationId) {
      throw new Error('congregation id is required');
    }

    const results = await pool.query(`INSERT INTO addresses (
      congregationid,
      territory_id,
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
      ${ get(address, 'congregationId', '') },
      ${ get(address, 'territory_id', '') },
      'Regular',
      ${ escape(get(address, 'status')) || 'Active' },
      ${ get(address, 'sort', '') },
      ${ escape(get(address, 'addr1')) || '' },
      ${ escape(get(address, 'addr2')) || '' },
      ${ escape(get(address, 'city')) || '' },
      ${ escape(get(address, 'state_province')) || '' },
      ${ escape(get(address, 'postal_code')) || '' },
      ${ escape(get(address, 'phone')) || '' },
      ${ get(address, 'longitude', 'NULL') },
      ${ get(address, 'latitude', 'NULL') },
      ${ escape(get(address, 'notes')) || '' },
      ${ get(address, 'create_user', '') },
      NOW()
    )`);

    await changeLogAsync.addAddressChangeLog(address, 'insert', results.insertId);

    return results.insertId;
  }

  async update (address) {
    if (!(address && address.id)) {
      throw new Error('Address id is required');
    }

    const existing = this.getAddress(address.id);

    const sql = `UPDATE addresses SET
      congregationid = ${get(address, 'congregationId', '')},
      territory_id = ${get(address, 'territory_id', 0)},
      status = ${escape(get(address, 'status')) || ''},
      sort = ${get(address, 'sort', '')},
      addr1 = ${escape(get(address, 'addr1')) || ''},
      addr2 = ${escape(get(address, 'addr2')) || ''},
      city = ${escape(get(address, 'city')) || ''},
      state_province = ${escape(get(address, 'state_province')) || ''},
      postal_code = ${escape(get(address, 'postal_code')) || ''},
      phone = ${escape(get(address, 'phone')) || ''},
      longitude = ${get(address, 'longitude', 'NULL')},
      latitude = ${get(address, 'latitude', 'NULL')},
      update_user = ${get(address, 'update_user', '')},
      update_date = NOW(),
      notes = ${escape(get(address, 'notes')) || ''}
    WHERE id = ${get(address, 'id', '')}`;

    await changeLogAsync.addAddressChangeLog(address);
    await pool.query(sql);

    if (address.territory_id !== existing.territory_id) {
      // also change associated phone territory ids
      const sqlPhones = `UPDATE addresses SET
        territory_id = ${address.territory_id}
      WHERE type = 'Phone' AND parent_id = ${address.id}`;

      await pool.query(sqlPhones);
    }

  }

  async delete (id) {
    if (!id) throw new Error('id is required');
    const sql = `DELETE FROM addresses WHERE id = ${id} OR parent_id = ${id}`;
    await pool.query(sql);

    await changeLogAsync.addAddressChangeLog(address, 'delete');
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
    await pool.query(sql);
  }

  async getNearestAddresses (congId, coordinates, radius = 1, unit = 'mi', skip = 0, take = 15) {
    if (!congId) throw new Error('cong id is required');
    if (!coordinates) throw new Error('lat/lng coordinates is required');
    if (!['mi', 'km'].includes(unit)) throw new Error('unknown unit type. Expected "mi" or "km"');

    const lat = coordinates[0];
    const lng = coordinates[1];
    const factor = unit === 'mi' ? 3959 : unit === 'km' ? 6371 : 0;

    const sql = `SELECT *, ${this.aliases},
        ( ${factor} * acos( cos( radians(${lat}) ) * cos( radians( latitude ) )* cos( radians( longitude )
        - radians(${lng}) ) + sin( radians(${lat}) ) * sin( radians( latitude ) ) ) ) AS distance 
      FROM addresses 
      WHERE congregationid=${congId} AND status='Active' and territory_id != 0
      HAVING distance < ${radius} ORDER BY distance, territory_id LIMIT ${skip} , ${take}`;

    return await pool.query(sql);
  }
}


export default new AddressAsync();
