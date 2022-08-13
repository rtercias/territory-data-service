import { escape } from 'mysql';
import { pool } from '../server';

export async function getCurrentCampaign(congId) {
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

export async function startCampaign(name, congId, startDate, publisherId) {
  if (!name) {
    throw new Error('name is required');
  }
  if (!congId) {
    throw new Error('congId is required');
  }
  if (!startDate) {
    throw new Error('startDate is required');
  }
  if (!publisherId) {
    throw new Error('publisherId is required');
  }

  const campaign = {
    name: escape(name),
    congregation_id: congId,
    publisher_id: publisherId,
    start_date: escape(startDate),
  };
  const results = await pool.query('INSERT INTO campaigns SET ?', campaign);
  return results.insertId;
}

export async function endCampaign(campaignId, endDate) {
  if (!campaignId) {
    throw new Error('campaignId is required');
  }

  if (!endDate) {
    throw new Error('endDate is required');
  }

  const campaign = {
    end_date: endDate,
  };

  const results = await pool.query(`UPDATE campaigns SET ? WHERE id = ${campaignId}`, campaign);
  return results;
}
