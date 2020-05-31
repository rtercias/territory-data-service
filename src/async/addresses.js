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
    await conn.query(`INSERT INTO addresses (
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
      ${ get(address, 'congregationId') },
      ${ get(address, 'territory_id') },
      ${ get(address, 'sort') },
      '${ get(address, 'addr1') }',
      '${ get(address, 'addr2') }',
      '${ get(address, 'city') }',
      '${ get(address, 'state_province', '') }',
      '${ get(address, 'postal_code') }',
      '${ get(address, 'phone') }',
      ${ get(address, 'longitude', 'NULL') },
      ${ get(address, 'latitude', 'NULL') },
      '${ get(address, 'notes') }',
      '${ get(address, 'create_user') }',
      NOW()
    )`);
  }

  async update (address) {
    await conn.query(`UPDATE address SET
      congregationid = ${ get(address, 'congregationId') },
      territory_id = ${ get(address, 'territory_id') },
      sort = ${ get(address, 'sort') },
      addr1 = '${ get(address, 'addr1') }',
      addr2 = '${ get(address, 'addr2') }',
      city = '${ get(address, 'city') }',
      state_province = '${ get(address, 'state_province') }',
      postal_code = '${ get(address, 'postal_code') }',
      phone = '${ get(address, 'phone') }',
      latitude = ${ get(address, 'latitude', 'NULL') },
      longitude = ${ get(address, 'longitude', 'NULL') },
      notes = '${ get(address, 'notes') }',
      update_user = '${ get(address, 'update_user') }',
      update_date = NOW(),
    WHERE id = ${get(address, 'id')}`);
  }

  async delete (id) {
    await conn.query(`UPDATE address SET territory_id = 0 WHERE id=${id}`);
  }
}

export default new AddressAsync();
