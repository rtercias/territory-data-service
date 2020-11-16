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

  async update (cong) {
    if (!(cong && cong.id)) {
      throw new Error('Congregation id is required');
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
}

export default new CongregationAsync();
