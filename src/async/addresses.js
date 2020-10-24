import { toArray, get } from 'lodash';
import { conn } from '../server';
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
    return (await conn.query(sql))[0];
  }

  async getAddressesByTerritory (terrId, status = 'Active') {
    const statusCondition = 
      status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE type='Regular' AND territory_id=${terrId}${statusCondition}`;

    return toArray(await conn.query(sql));
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
    AND (addr1 LIKE '%${keyword}%' OR addr2 LIKE '%${keyword}%')`;
    return toArray(await conn.query(sql));
  }

  async getDNC (congId) {
    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE type='Regular' AND congregationid=${congId} AND status='DNC'`;
    return toArray(await conn.query(sql));
  }

  async create (address) {
    if (!address.congregationId) {
      throw new Error('congregation id is required');
    }

    const results = await conn.query(`INSERT INTO addresses (
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
      '${ get(address, 'status', 'Active') }',
      ${ get(address, 'sort', '') },
      '${ get(address, 'addr1', '') }',
      '${ get(address, 'addr2', '') }',
      '${ get(address, 'city', '') }',
      '${ get(address, 'state_province', '') }',
      '${ get(address, 'postal_code', '') }',
      '${ get(address, 'phone', '') }',
      ${ get(address, 'longitude', 'NULL') },
      ${ get(address, 'latitude', 'NULL') },
      '${ get(address, 'notes', '') }',
      ${ get(address, 'create_user', '') },
      NOW()
    )`);

    return results.insertId;
  }

  async update (address) {
    if (!(address && address.id)) {
      throw new Error('Address id is required');
    }

    const sql = `UPDATE addresses SET
      congregationid = ${get(address, 'congregationId', '')},
      territory_id = ${get(address, 'territory_id', '')},
      status = '${get(address, 'status', '')}',
      sort = ${get(address, 'sort', '')},
      addr1 = '${get(address, 'addr1', '')}',
      addr2 = '${get(address, 'addr2', '')}',
      city = '${get(address, 'city', '')}',
      state_province = '${get(address, 'state_province', '')}',
      postal_code = '${get(address, 'postal_code', '')}',
      phone = '${get(address, 'phone', '')}',
      longitude = ${get(address, 'longitude', 'NULL')},
      latitude = ${get(address, 'latitude', 'NULL')},
      update_user = ${get(address, 'update_user', '')},
      update_date = NOW(),
      notes = '${get(address, 'notes', '')}'
    WHERE id = ${get(address, 'id', '')}`;

    await changeLogAsync.addAddressChangeLog(address);
    await conn.query(sql);
  }

  async changeStatus (id, status, userid, notes) {
    if (!id) throw new Error('id is required');
    if (!status) throw new Error('status is required');
    if (!userid) throw new Error('userid is required');

    const sql = `UPDATE addresses SET 
      status = '${status}', update_user = ${userid}, notes = '${notes}'
      WHERE id=${id}`;

    await changeLogAsync.addAddressChangeLog({ id, update_user: userid, status, notes });
    await conn.query(sql);
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

  async lastActivity (addressId) {
    if (!addressId) throw new Error('address id is required');

    const sql = `SELECT * FROM address_last_activity WHERE address_id=${addressId}`;
    const result = toArray(await conn.query(sql));
    return result.length && result[0];
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

    return await conn.query(sql);
  }
}


export default new AddressAsync();
