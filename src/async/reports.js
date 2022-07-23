import { pool } from '../server';
import { getCurrentCampaign } from './campaigns';

class ReportsAsync {
  async getAssignmentRecords(congId, campaignMode) {
    // TODO: change back to prod pivot
    let sql = `SELECT p.*, t.id as territory_id, t.name as territory_name, t.description as territory_description
      FROM territories t LEFT JOIN territorycheckouts_pivot_campaign p ON t.id = p.territory_id
      WHERE t.congregationid=${congId}`;

    switch (campaignMode) {
      case true:
        const currentCampaign = await getCurrentCampaign(congId, pool);
        if (currentCampaign) {
          // for backwards compatibility. TODO: replace with commmented code at the end of 2022
          sql += ` AND (p.campaign_id = ${currentCampaign.id} OR p.campaign = true)`;
          // sql += ` AND p.campaign_id = ${currentCampaign.id}`;
        }
        break;
      case false:
        // for backwards compatibility. TODO: replace with commmented code at the end of 2022
        sql += ' AND p.campaign_id IS NULL AND p.campaign = false';
        // sql += ' AND p.campaign_id IS NULL';
        break;
      default:
        // no filter
    }

    sql += ` ORDER BY t.id, p.timestamp`;
    return await pool.query(sql);
  }
}

export default new ReportsAsync();
