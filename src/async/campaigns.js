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

export async function getHistoricalCampaigns(congId) {
  const result = await pool.query(`
    SELECT c.* FROM campaigns c
    WHERE c.congregation_id = ${congId}
    ORDER BY c.start_date DESC
  `);
  return result;
}

export async function startCampaign(name, congId, publisherId) {
  if (!name) {
    throw new Error('name is required');
  }
  if (!congId) {
    throw new Error('congId is required');
  }
  if (!publisherId) {
    throw new Error('publisherId is required');
  }

  const campaign = {
    name: name,
    congregation_id: congId,
    publisher_id: publisherId,
  };

  const results = await pool.query('INSERT INTO campaigns SET ?, start_date = NOW()', campaign);
  return results.insertId;
}

export async function updateCampaign(campaignId, name, startDate, endDate) {
  if (!campaignId) {
    throw new Error('campaignId is required');
  }

  if (!name) {
    throw new Error('name is required');
  }

  const endDateSet = '';
  if (endDate) {
    if (new Date(endDate) <= new Date(startDate)) {
      throw new Error('end date cannot be less or equal to start date');
    }
    endDateSet = `, end_date = ${endDate} `;
  }

  const results = await pool.query(`UPDATE campaigns SET name=${name}, start_date = ${startDate} ${endDateSet} WHERE id = ${campaignId}`);
  return !!results;
}

export async function endCampaign(campaignId) {
  if (!campaignId) {
    throw new Error('campaignId is required');
  }

  const results = await pool.query(`UPDATE campaigns SET end_date = NOW() WHERE id = ${campaignId}`);
  return !!results;
}
