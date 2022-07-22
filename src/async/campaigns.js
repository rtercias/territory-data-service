export async function getCurrentCampaign(congId, pool) {
    // get current campaign info, if applicable
    const resultCampaign = await pool.query(`
      SELECT c.* FROM campaigns c
      WHERE c.congregation_id = ${congId}
        AND c.end_date IS NULL
      ORDER BY c.start_date DESC
    `);
    const currentCampaign = resultCampaign && resultCampaign.length && resultCampaign[0];
    return currentCampaign || null;
}
