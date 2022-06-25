const { config } = require('firebase-functions');

import orderBy from 'lodash/orderBy';
import get from 'lodash/get';
import { escape } from 'mysql';
import { pool } from '../server';
import axios from 'axios';
import addressAsync from './addresses';
import activityLog from './activityLog';

class TerritoryAsync {
  async getTerritory (id) {
    const result = await (pool.query(`SELECT * FROM territories WHERE id=${id}`));
    return result[0];
  }

  async getTerritories (congId, limit, offset = 0) {
    return await pool.query(`
      SELECT * FROM territories
      WHERE congregationid=${congId}
      ${limit ? `LIMIT ${offset},${limit}` : ''}
    `);
  }

  async searchTerritories (congId, keyword) {
    return await pool.query(`SELECT * FROM territories
      WHERE congregationid=${congId} AND (name LIKE '%${keyword}%' OR description LIKE '%${keyword}%')`);
  }

  async getTerritoryStatus (territoryId) {
    return await pool.query(
      `
        SELECT ck.*, ck.id AS checkout_id, ck.territoryid AS territory_id,
          p.username, p.firstname, p.lastname, p.status AS publisher_status
        FROM territorycheckouts ck
        JOIN territories t ON ck.territoryid = t.id
        JOIN congregations c ON t.congregationid = c.id AND ck.campaign = c.campaign
        JOIN publishers p ON ck.publisherid = p.id
        WHERE ck.territoryid=${territoryId}
        ORDER BY ck.timestamp DESC
        LIMIT 2
      `
    );
  }

  async getTerritoryCurrentStatus(territoryId, username) {
    // get cong
    const resultCong = await pool.query(`
      SELECT c.* FROM territories t JOIN congregations c ON t.congregationid = c.id
      WHERE t.id=${territoryId}`);
    const cong = resultCong[0];

    const sql = `SELECT * FROM territorycheckouts_pivot p
      WHERE territory_id=${territoryId} AND p.in is null
        AND campaign=${cong.campaign}
      ORDER BY timestamp DESC `;

    return await pool.query(sql);
  }

  async getTerritoriesByUser (congId, username, limit, offset=0) {
    // get cong
    const resultCong = await pool.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    return await pool.query(
      `
        SELECT ck.*, t.*
        FROM territorycheckouts_pivot ck
        JOIN territories t ON ck.territory_id = t.id
        WHERE ck.congregationid=${congId}
        AND ck.username='${username}'
        AND ck.in IS NULL
        AND COALESCE(ck.campaign, 0)=${cong.campaign || 0}
        ${limit ? `LIMIT ${offset},${limit}` : ''}
      `
    );
  }

  async getMostRecentCheckin (territoryId, username) {
    return await pool.query(
      `
        SELECT ck.* FROM territorycheckouts ck
        JOIN publishers p ON ck.publisherid = p.id
        WHERE ck.territoryid=${territoryId} AND p.username='${username}'
        AND ck.status = 'IN'
        ORDER BY ck.timestamp DESC
        LIMIT 1
      `
    );
  }

  async getTerritoriesByGroup (groupId, limit, offset = 0) {
    return await pool.query(`SELECT * FROM territories
      WHERE group_id=${groupId}
      ORDER BY description, name
      ${limit ? `LIMIT ${offset},${limit}` : ''}
    `);
  }

  async territoryCheckoutStatus (checkout_id) {
    const sql = `SELECT * FROM territorycheckouts_pivot p WHERE p.checkout_id = ${checkout_id}`;
    const result = await pool.query(sql);
    return result[0];
  }

  async create (territory) {
    if (!territory.congregationid) {
      throw new Error('congregation id is required');
    }
    if (!territory.group_id) {
      throw new Error('group id is required');
    }
    if (!territory.create_user) {
      throw new Error('create user is required');
    }

    const sql = `INSERT INTO territories (
      congregationid,
      name,
      description,
      type,
      group_id,
      create_user,
      tags
    ) VALUES (
      ${ territory.congregationid },
      ${ escape(get(territory, 'name')) || '' },
      ${ escape(get(territory, 'description')) || '' },
      ${ escape(get(territory, 'type')) || '' },
      ${ territory.group_id },
      ${ territory.create_user },
      ${ escape(get(territory, 'tags')) || '' }
    )`;
    const results = await pool.query(sql);

    return results.insertId;
  }

  async update (territory) {
    if (!(territory && territory.id)) {
      throw new Error('id is required');
    }
    if (!territory.congregationid) {
      throw new Error('congregation id is required');
    }
    if (!territory.group_id) {
      throw new Error('group id is required');
    }
    if (!territory.update_user) {
      throw new Error('update user is required');
    }

    const sql = `UPDATE territories SET
      congregationid = ${territory.congregationid},
      name = ${escape(get(territory, 'name')) || ''},
      description = ${escape(get(territory, 'description')) || ''},
      type = ${escape(get(territory, 'type')) || ''},
      group_id = ${territory.group_id},
      update_user = ${territory.update_user},
      tags = ${escape(get(territory, 'tags')) || ''}
    WHERE id = ${territory.id}`;
    await pool.query(sql);
  }

  async delete (id) {
    if (!id) throw new Error('id is required');

    const addresses = await addressAsync.getAddressesByTerritory(id);
    if (addresses.length) {
      throw new Error('Cannot delete a territory containing addresses');
    }

    const sql = `DELETE FROM territories WHERE id = ${id}`;
    return await pool.query(sql);
  }

  async saveTerritoryActivity(status, territoryId, publisherId, user, checkoutId) {
    // get cong
    const resultCong = await pool.query(`
      SELECT c.* FROM territories t JOIN congregations c ON t.congregationid = c.id
      WHERE t.id=${territoryId}`);
    const cong = resultCong[0];
    let results;

    const checkout = {
      territoryid: escape(territoryId),
      publisherid: escape(publisherId),
      status,
      create_user: escape(user),
      campaign: escape(cong.campaign),
      parent_checkout_id: escape(checkoutId),
    };
    results = await pool.query('INSERT INTO territorycheckouts SET ?', checkout);
    return results.insertId;
  }

  async reassignCheckout(checkoutId, publisherId, user) {
    if (!checkoutId) throw new Error('checkout id is required');
    if (!publisherId) throw new Error('publisher id is required');
    if (!user) throw new Error('user is required');
    const sql = `
      UPDATE territorycheckouts SET publisherid = ${publisherId}, create_user = '${user}'
      WHERE id = ${checkoutId}
    `;
    await pool.query(sql);
    const checkout = await this.territoryCheckoutStatus(checkoutId);
    return get(checkout, 'territory_id');
  }

  async optimize(territoryId, start, end) {
    try {
      const addresses = orderBy(await addressAsync.getAddressesByTerritory(territoryId), 'sort');

      if (!addresses.length) {
        throw new Error('No addresses found');
      }

      if (addresses.length === 1) {
        return addresses;
      }

      const data = this.createOptimizationData(addresses, start, end);
      
      const options = {
        headers: {
          'Authorization': config().api.open_route_token,
          'Content-Type': 'application/json',
          'Content-Length': data.jobs.length,
        },
      };

      const response = await axios.post('https://api.openrouteservice.org/optimization', data, options);
      const steps = response && response.data && response.data.routes[0].steps;
      return this.reorderAddresses(steps, addresses);

    } catch (e) {
      console.error(e);
    }
  }

  createOptimizationData(addresses, start, end) {
    const geoCodedAddresses = addresses.filter(a => !!a.longitude && !!a.latitude);

    const jobs = geoCodedAddresses.map(a => {
      return {
        id: a.id,
        service: 300,
        amount: [1],
        location: [a.longitude, a.latitude],
        skills: [1],
      };
    });

    const first = jobs[0];

    const vehicles = [
      {
        id: 1,
        profile: 'driving-car',
        start: start || first.location,
        end,
        capacity: [4],
        skills: [1],
      },
    ];

    return { jobs, vehicles };
  }

  reorderAddresses(steps, addresses) {
    const jobSteps = steps.filter(s => s.type === 'job');

    if (!jobSteps || jobSteps.length === 0) {
      throw new Error('Optimization API returned no data');
    }

    let nextIndex = jobSteps.length;

    for (const addr of addresses) {
      const index = jobSteps.findIndex(s => s.job === addr.id);
      
      if (index === -1) {
        addr.sort = nextIndex;
        nextIndex++;
      } else {
        addr.sort = index;
      }
    }

    return orderBy(addresses, 'sort');
  }

  async lastActivity(territoryId) {
    if (!territoryId) throw new Error('territory id is required');

    const sql = `SELECT log.*, ck.territoryid AS territory_id
      FROM activitylog log 
      JOIN territorycheckouts ck ON log.checkout_id = ck.id
      WHERE ck.territoryid = ${territoryId}
      ORDER BY log.timestamp DESC
      LIMIT 1`;
    const result = await pool.query(sql);
    return result.length ? result[0] : null;
  }

  async checkinAll(congId, username, tz_offset, timezone, _campaign) {
    if (!congId) throw new Error('congregation id is required');
    if (!username) throw new Error('username is required');
    if (!tz_offset) throw new Error('tz_offset is required');
    if (!timezone) throw new Error('timezone is required');

    // get user
    const resultUser = await pool.query(`SELECT * FROM publishers WHERE username='${username}'`);
    const user = resultUser[0];

    // get cong
    const resultCong = await pool.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    const campaign = _campaign === null || _campaign === undefined ? cong.campaign : _campaign;

    // get all checked out territories
    const sqlCheckOuts = `SELECT tc.* FROM territorycheckouts_pivot tc
      WHERE tc.congregationid = ${congId} AND tc.in IS NULL`;
    const checkouts = await pool.query(sqlCheckOuts);

    for (const ck of checkouts) {
      // check in
      const sql = `INSERT INTO territorycheckouts (territoryid, publisherid, status, create_user, campaign, parent_checkout_id)
        VALUES (${ck.territory_id}, ${ck.publisher_id}, 'IN', '${username}', ${ck.campaign}, ${ck.checkout_id})`;
      await pool.query(sql);

      // reset NH statuses
      await activityLog.resetTerritoryActivity(ck.checkout_id, user.id, tz_offset, timezone);
    }
  }

  async createCampaignCheckouts(congId, username, _campaign) {
    if (!congId) throw new Error('congregation id is required');
    if (!username) throw new Error('username is required');

    // get cong
    const resultCong = await pool.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    const campaign = _campaign === null || _campaign === undefined ? cong.campaign : _campaign;

    // get all checked out territories
    const sqlCheckOuts = `SELECT tc.* FROM territorycheckouts_pivot tc
      WHERE tc.congregationid = ${congId} AND tc.in IS NULL AND COALESCE(tc.campaign, 0)=${campaign || 0}`;
    const checkouts = await pool.query(sqlCheckOuts);

    for (const ck of checkouts) {
      // replicate all checked out territories with current campaign flag
      const sql = `INSERT INTO territorycheckouts (territoryid, publisherid, status, timestamp, create_user, campaign)
        VALUES(${ck.territory_id}, ${ck.publisher_id}, 'OUT', NOW(), '${username}', ${campaign})`;
      const result = await pool.query(sql);
      const logs = await activityLog.read(ck.checkout_id);
    }
  }

  async addressCountByTerritories (congId) {
    if (!congId) throw new Error('cong id is required');

    const sql = `SELECT a.territory_id as id, count(*) as addressCount FROM addresses a 
      WHERE a.congregationid = ${congId} AND a.type = 'Regular'
      AND a.status = 'Active' AND a.territory_id IS NOT NULL
      GROUP BY a.territory_id`;

    return await pool.query(sql);
  }

  async phoneCountByTerritories (congId) {
    if (!congId) throw new Error('cong id is required');

    const sql = `SELECT p.territory_id as id, count(*) as phoneCount FROM addresses a 
      JOIN addresses p ON a.id = p.parent_id
      WHERE p.congregationid = ${congId} AND p.type = 'Phone'
      AND p.status = 'Active' GROUP BY p.territory_id`;

    return await pool.query(sql);
  }
}

export default new TerritoryAsync();
