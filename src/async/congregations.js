import { toArray, get } from 'lodash';
import { conn } from '../server';

class CongregationAsync {
  async getCongregationById (id) {
    return (await conn.query(`SELECT * FROM congregations WHERE id=${id}`))[0];
  }

  async getAllCongregations () {
    return toArray(await conn.query(`SELECT * FROM congregations`));
  }

  async searchCongregations (keyword) {
    return toArray(await conn.query(`SELECT * FROM congregations WHERE name LIKE '%${keyword}%' OR description LIKE '%${keyword}%'`));
  }

  async create (cong) {
    if (!cong.name) {
      throw new Error('name is required');
    }
    if (!cong.create_user) {
      throw new Error('create user is required');
    }

    const sql = `INSERT INTO congregations (
      name,
      description,
      create_user,
      language,
      campaign,
      admin_email,
      options
    ) VALUES (
      '${ get(cong, 'name', '') }',
      '${ get(cong, 'description', '') }',
      '${ get(cong, 'create_user', '') }',
      '${ get(cong, 'language', '') }',
      ${ get(cong, 'campaign', '') },
      '${ get(cong, 'admin_email', '') }',
      '${ get(cong, 'options', '') }'
    )`;
    const results = await conn.query(sql);

    return results.insertId;
  }

  async update (cong) {
    if (!(cong && cong.id)) {
      throw new Error('Congregation id is required');
    }
    if (!cong.update_user) {
      throw new Error('update user is required');
    }

    const sql = `UPDATE congregations SET
      name = '${get(cong, 'name', '')}',
      description = '${get(cong, 'description', '')}',
      language = '${get(cong, 'language', '')}',
      campaign = ${get(cong, 'campaign', 0)},
      admin_email = '${get(cong, 'admin_email', '')}',
      options = '${get(cong, 'options', '')}'
    WHERE id = ${get(cong, 'id', '')}`;

    await conn.query(sql);
  }

  async delete (id) {
    if (!id) throw new Error('id is required');
    const sql = `DELETE FROM congregations WHERE id = ${id}`;
    return await conn.query(sql);
  }
}

export default new CongregationAsync();
