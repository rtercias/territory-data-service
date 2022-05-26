import { pool } from '../server';

class ReportsAsync {
  async getAssignmentRecords(congId, campaignMode) {
    let sql = '';
    if (campaignMode === undefined) {
      sql = `SELECT p.*, t.id as territory_id, t.name as territory_name, t.description as territory_description
      FROM territories t LEFT JOIN territorycheckouts_pivot p ON t.id = p.territory_id
      WHERE t.congregationid=${congId}
      ORDER BY t.id, p.timestamp`;
    } else {
      sql = `SELECT p.*, t.id as territory_id, t.name as territory_name, t.description as territory_description
      FROM territories t LEFT JOIN territorycheckouts_pivot p ON t.id = p.territory_id
      WHERE t.congregationid=${congId} AND COALESCE(p.campaign, 0)=${campaignMode}
      ORDER BY t.id, p.timestamp`;
    }

    return await pool.query(sql);
  }
}

export default new ReportsAsync();
