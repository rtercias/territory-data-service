import { toArray, get } from 'lodash';
import { conn } from '../index';

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

    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE territory_id=${terrId}${statusCondition}`;

    return toArray(await conn.query(sql));
  }

  async searchAddresses (congId, keyword, status = 'Active') {
    const statusCondition = status === '*' ? '' :
      status === '!Active' ? ` AND NOT status = 'Active'` :
      ` AND status = '${status}'`;

    const sql = `SELECT *, ${this.aliases} FROM addresses 
    WHERE congregationid=${congId}${statusCondition} AND (addr1 LIKE '%${keyword}%' OR addr2 LIKE '%${keyword}%')`;
    return toArray(await conn.query(sql));
  }

  async getDNC (congId) {
    const sql = `SELECT *, ${this.aliases} FROM addresses WHERE congregationid=${congId} AND status='DNC'`;
    return toArray(await conn.query(sql));
  }

  async create (address) {
    if (!address.congregationId) {
      throw new Error('congregation id is required');
    }

    const results = await conn.query(`INSERT INTO addresses (
      congregationid,
      territory_id,
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

    await conn.query(sql);
  }

  async changeStatus (id, status, userid, notes) {
    if (!id) throw new Error('id is required');
    if (!status) throw new Error('status is required');
    if (!userid) throw new Error('userid is required');

    const sql = `UPDATE addresses SET 
      status = '${status}', update_user = ${userid}, notes = '${notes}'
      WHERE id=${id}`;

    await conn.query(sql);
  }
}


export default new AddressAsync();
