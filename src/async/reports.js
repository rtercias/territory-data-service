import { pool } from '../server';

class ReportsAsync {
  async getAssignmentRecords(congId, campaignMode) {
    let sql = '';
    if (campaignMode === undefined) {
      sql = `SELECT * FROM territorycheckouts_pivot
      where congregationid=${congId}
      order by territory_id, timestamp`;
    } else {
      sql = `SELECT * FROM territorycheckouts_pivot
      where congregationid=${congId} and COALESCE(campaign, 0)=${campaignMode}
      order by territory_id, timestamp`;
    }

    return await pool.query(sql);
  }
}

export default new ReportsAsync();
