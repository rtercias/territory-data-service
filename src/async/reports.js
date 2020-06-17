import { conn } from '../server';
import { toArray } from 'lodash';

class ReportsAsync {
  async getAssignmentRecords(congId) {
    return toArray(await conn.query(`SELECT * FROM territorycheckouts_pivot where congregationid=${congId} order by territory_id, timestamp`));
  }
}

export default new ReportsAsync();
