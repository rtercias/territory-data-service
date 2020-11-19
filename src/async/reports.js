import { conn } from '../server';
import { toArray } from 'lodash';

class ReportsAsync {
  async getAssignmentRecords(congId) {
    // get cong
    const resultCong = await conn.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    return toArray(await conn.query(`SELECT * FROM territorycheckouts_pivot
      where congregationid=${congId} and COALESCE(campaign, 0)=${cong.campaign || 0}
      order by territory_id, timestamp`));
  }
}

export default new ReportsAsync();
