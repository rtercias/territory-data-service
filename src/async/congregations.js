import { get } from 'lodash';
import { escape } from 'mysql';
import { pool } from '../server';

class CongregationAsync {
  async getCongregationById (id) {
    const result = await pool.query(`SELECT * FROM congregations WHERE id=${id}`);
    return result[0];
  }

  async getAllCongregations () {
    return await pool.query(`SELECT * FROM congregations`);
  }

  async searchCongregations (keyword) {
    return await pool.query(`SELECT * FROM congregations
      WHERE name LIKE '%${keyword}%' OR description LIKE '%${keyword}%' OR circuit = '${keyword}'`);
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
      options,
      circuit
    ) VALUES (
      ${ escape(cong.name) },
      ${ escape(get(cong, 'description')) || '' },
      ${ escape(cong.create_user) },
      ${ escape(get(cong, 'language')) || '' },
      ${ escape(get(cong, 'campaign')) || '' },
      ${ escape(get(cong, 'admin_email')) || '' },
      ${ escape(get(cong, 'options')) || '' },
      ${ escape(get(cong, 'circuit')) || '' }
    )`;
    const results = await pool.query(sql);

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
      name = ${escape(get(cong, 'name')) || ''},
      description = ${escape(get(cong, 'description')) || ''},
      language = ${escape(get(cong, 'language')) || ''},
      campaign = ${escape(get(cong, 'campaign')) || 0},
      admin_email = ${escape(get(cong, 'admin_email')) || ''},
      options = ${escape(get(cong, 'options')) || ''},
      circuit = ${escape(get(cong, 'circuit')) || ''},
      update_user = ${cong.update_user}
    WHERE id = ${cong.id}`;

    await pool.query(sql);
  }

  async delete (id) {
    if (!id) throw new Error('id is required');
    const sql = `DELETE FROM congregations WHERE id = ${id}`;
    return await pool.query(sql);
  }
}

export default new CongregationAsync();
