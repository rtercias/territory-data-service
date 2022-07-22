import { pool } from '../server';
import { getCurrentCampaign } from './campaigns';

class ReportsAsync {
  async getAssignmentRecords(congId, campaignMode) {
    let sql = `SELECT p.*, t.id as territory_id, t.name as territory_name, t.description as territory_description
      FROM territories t LEFT JOIN territorycheckouts_pivot p ON t.id = p.territory_id
      WHERE t.congregationid=${congId}`;

    switch (campaignMode) {
      case true:
        const currentCampaign = await getCurrentCampaign(congId, pool);
        if (currentCampaign) {
          sql += ` AND p.campaign_id = ${currentCampaign.id}`;
        }
        break;
      case false:
        sql += ' AND p.campaign_id IS NULL';
        break;
      default:
        // no filter
    }

    sql += ` ORDER BY t.id, p.timestamp`;
    return await pool.query(sql);
  }
}

export default new ReportsAsync();
