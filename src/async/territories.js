const { config } = require('firebase-functions');
import toArray from 'lodash/toArray';
import orderBy from 'lodash/orderBy';
import { conn } from '../server';
import axios from 'axios';
import addressAsync from './addresses';
import activityLog from './activityLog';

class TerritoryAsync {
  async getTerritory (id) {
    return toArray(await conn.query(`SELECT * FROM territories WHERE id=${id}`))[0];
  }

  async getTerritories (congId) {
    return toArray(await conn.query(`SELECT * FROM territories WHERE congregationid=${congId}`));
  }

  async searchTerritories (congId, keyword) {
    return toArray(await conn.query(`SELECT * FROM territories
      WHERE congregationid=${congId} AND (name LIKE '%${keyword}%' OR description LIKE '%${keyword}%')`));
  }

  async getTerritoryStatus (congId, territoryId, username) {
    return toArray(await conn.query(
      `
        SELECT ck.*, t.*, ck.id AS checkout_id, t.id AS territory_id, p.username, p.firstname, p.lastname, p.status AS publisher_status
        FROM territorycheckouts ck
        JOIN territories t ON ck.territoryid = t.id
        JOIN publishers p ON ck.publisherid = p.id
        JOIN congregations c ON t.congregationid = c.id AND ck.campaign = c.campaign
        WHERE t.congregationid=${congId}
        ${!!territoryId ? ` AND ck.territoryid=${territoryId}` : ''}
        ${!!username ? ` AND p.username='${username}'` : ''}
      `
    ));
  }

  async getTerritoriesByUser (congId, username) {
    // get cong
    const resultCong = await conn.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    return toArray(await conn.query(
      `
        SELECT ck.*, t.*
        FROM territorycheckouts_pivot ck
        JOIN territories t ON ck.territory_id = t.id
        WHERE ck.congregationid=${congId}
        AND ck.username='${username}'
        AND ck.in IS NULL
        AND COALESCE(ck.campaign, 0)=${cong.campaign || 0}
      `
    ));
  }

  async getMostRecentCheckin (territoryId, username) {
    return await conn.query(
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

  async getTerritoriesByCity (congId, city, territoryId) {
    const andCity = city ? ` city LIKE '%${city}%'` : '';
    const andTerritoryId = territoryId ? ` AND id=${territoryId}` : '';
    return toArray(await conn.query(`SELECT * FROM territories_by_city WHERE congregationid=${congId}${andCity}${andTerritoryId}`));
  }

  async getTerritoriesByGroupCode (congId, groupCode) {
    return toArray(await conn.query(`SELECT * FROM territories_by_city WHERE congregationid=${congId} AND group_code='${groupCode}' ORDER BY city, name`));
  }

  async territoryCheckoutStatus (checkout_id) {
    const sql = `SELECT * FROM territorycheckouts_pivot p WHERE p.checkout_id = ${checkout_id}`;
    const result = await conn.query(sql);
    return result[0];
  }

  async saveTerritoryActivity(status, territoryId, publisherId, user) {
    // get cong
    const resultCong = await conn.query(`
      SELECT c.* FROM territories t JOIN congregations c ON t.congregationid = c.id
      WHERE t.id=${territoryId}`);
    const cong = resultCong[0];

    if (user) {
      await conn.query(`INSERT INTO territorycheckouts (territoryid, publisherid, status, create_user, campaign)
        VALUES (${territoryId}, ${publisherId}, '${status}', '${user}', ${cong.campaign})`);
    } else {
      await conn.query(`INSERT INTO territorycheckouts (territoryid, publisherid, status, campaign)
        VALUES (${territoryId}, ${publisherId}, '${status}', ${cong.campaign})`);
    }
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

    const sql = `SELECT * FROM territory_last_activity WHERE territory_id=${territoryId}`;
    const result = toArray(await conn.query(sql));
    return result.length && result[0];
  }

  async checkinAll(congId, username, tz_offset, timezone, _campaign) {
    if (!congId) throw new Error('congregation id is required');
    if (!username) throw new Error('username is required');
    if (!tz_offset) throw new Error('tz_offset is required');
    if (!timezone) throw new Error('timezone is required');

    // get user
    const resultUser = await conn.query(`SELECT * FROM publishers WHERE username='${username}'`);
    const user = resultUser[0];

    // get cong
    const resultCong = await conn.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    const campaign = _campaign === null || _campaign === undefined ? cong.campaign : _campaign;

    // get all checked out territories
    const sqlCheckOuts = `SELECT tc.* FROM territorycheckouts_pivot tc
      WHERE tc.congregationid = ${congId} AND tc.in IS NULL AND COALESCE(tc.campaign, 0)=${campaign || 0}
      AND tc.territory_id IN (484, 562)`; // add this for testing
    const checkouts = await conn.query(sqlCheckOuts);

    for (const ck of checkouts) {
      // check in
      const sql = `INSERT INTO territorycheckouts (territoryid, publisherid, status, create_user, campaign)
        VALUES (${ck.territory_id}, ${ck.publisher_id}, 'IN', '${username}', ${campaign})`;
      await conn.query(sql);

      // reset NH statuses
      await activityLog.resetTerritoryActivity(ck.checkout_id, user.id, tz_offset, timezone);
    }
  }

  async createCampaignCheckouts(congId, username, _campaign) {
    if (!congId) throw new Error('congregation id is required');
    if (!username) throw new Error('username is required');

    // get cong
    const resultCong = await conn.query(`SELECT * FROM congregations WHERE id=${congId}`);
    const cong = resultCong[0];

    const campaign = _campaign === null || _campaign === undefined ? cong.campaign : _campaign;

    // get all checked out territories
    const sqlCheckOuts = `SELECT tc.* FROM territorycheckouts_pivot tc
      WHERE tc.congregationid = ${congId} AND tc.in IS NULL AND COALESCE(tc.campaign, 0)=${campaign || 0}
      AND tc.territory_id IN (484, 562)`; // add this for testing
    const checkouts = await conn.query(sqlCheckOuts);

    for (const ck of checkouts) {
      // replicate all checked out territories with current campaign flag
      const sql = `INSERT INTO territorycheckouts (territoryid, publisherid, status, timestamp, create_user, campaign)
        VALUES(${ck.territory_id}, ${ck.publisher_id}, 'OUT', NOW(), '${username}', ${campaign})`;
      const result = await conn.query(sql);
      const logs = await activityLog.read(ck.checkout_id);

      // ONE-TIME RUN. Remove this after first run
      for (const log of logs) {
        log.checkout_id = result.insertId;
        // replicate latest activity status for each address/phone
        await activityLog.create(log);
      }
    }
  }
}

export default new TerritoryAsync();
