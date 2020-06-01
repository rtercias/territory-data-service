import { toArray, get } from 'lodash';
import { conn } from './../../index';

class AddressAsync {
  constructor() {
    this.aliases = `
      congregationid as congregationId,
      create_user as create_username,
      update_user as update_username
    `;
  }

  async getAddress (id) {
    return (await conn.query(`SELECT *, ${this.aliases} FROM addresses WHERE id=${id}`))[0];
  }

  async getAddressesByTerritory (terrId) {
    return toArray(await conn.query(`SELECT *, ${this.aliases} FROM addresses WHERE territory_id=${terrId}`));
  }

  async searchAddresses (congId, keyword) {
    return toArray(await conn.query(`SELECT *, ${this.aliases} FROM addresses 
      WHERE congregationid=${congId} AND addr1 LIKE '%${keyword}%' OR addr2 LIKE '%${keyword}%'`));
  }

  async getDNC (congId) {
    return toArray(await conn.query(`SELECT *, ${this.aliases} FROM addresses
      WHERE congregationid=${congId} AND notes LIKE '%DO NOT CALL%'`));
  }

  async create (address) {
    const results = await conn.query(`INSERT INTO addresses (
      congregationid,
      territory_id,
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
      ${ address.congregationId ? `congregationid = ${address.congregationId},` : '' }
      ${ address.territory_id ? `territory_id = ${address.territory_id},` : '' }
      ${ address.sort ? `sort = ${address.sort},` : '' }
      ${ address.addr1 ? `addr1 = '${address.addr1}',` : '' }
      ${ address.addr2 ? `addr2 = '${address.addr2}',` : '' }
      ${ address.city ? `city = '${address.city}',` : '' }
      ${ address.state_province ? `state_province = '${address.state_province}',` : '' }
      ${ address.postal_code ? `postal_code = '${address.postal_code}',` : '' }
      ${ address.phone ? `phone = '${address.phone}',` : '' }
      ${ address.latitude ? `latitude = ${address.latitude},` : '' }
      ${ address.longitude ? `longitude = ${address.longitude},` : '' }
      ${ address.notes ? `notes = '${address.notes}',` : '' }
      ${ address.update_user ? `update_user = ${address.update_user},` : '' }
      update_date = NOW()
    WHERE id = ${address.id}`;

    await conn.query(sql);
  }

  async softDelete (id, userid, notes) {
    await conn.query(`UPDATE addresses SET territory_id = 0, update_user = ${userid}, notes = '${notes || ''}' WHERE id=${id}`);
  }
}

export default new AddressAsync();
