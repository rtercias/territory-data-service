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
    const result = await (pool.query(`
      SELECT ck.*, t.* FROM territories t
      LEFT JOIN territorycheckouts_current ck ON ck.territory_id = t.id
      WHERE t.id=${id}
    `));
    return result[0];
  }

  async getTerritories (congId, limit, offset = 0, withStatus) {
    const statusSelect = withStatus ? 'ck.*,' : '';
    const statusJoin = withStatus ? 'JOIN territorycheckouts_current ck ON ck.territory_id = t.id' : '';

    return await pool.query(`
      SELECT ${statusSelect}
      t.* FROM territories t
      ${statusJoin}
      WHERE t.congregationid=${congId}
      ${limit ? `LIMIT ${offset},${limit}` : ''}
    `);
  }

  async searchTerritories (congId, keyword, withStatus) {
    const statusSelect = withStatus ? 'ck.*,' : '';
    const statusJoin = withStatus ? 'JOIN territorycheckouts_current ck ON ck.territory_id = t.id' : '';
    return await pool.query(`
      SELECT
        ${statusSelect}
        t.* FROM territories t
      ${statusJoin}
      WHERE t.congregationid=${congId}
      AND (t.name LIKE '%${keyword}%' OR t.description LIKE '%${keyword}%')`);
  }

  async getTerritoryStatus (territoryId) {
    return await pool.query(
      `SELECT * FROM territorycheckouts_current WHERE territory_id = ${territoryId}
      ORDER BY timestamp DESC
      LIMIT 1`
    );
  }

  async getTerritoryCurrentStatus(territoryId) {
    // get cong
    const resultCong = await pool.query(`
      SELECT c.* FROM territories t JOIN congregations c ON t.congregationid = c.id
      WHERE t.id=${territoryId}`);
    const cong = resultCong[0];

    const sql = `SELECT * FROM territorycheckouts_current p
      WHERE territory_id=${territoryId} AND p.in is null
      ORDER BY timestamp DESC `;

    return await pool.query(sql);
  }

  async getTerritoriesByUser (congId, username, limit, offset=0) {

    return await pool.query(
      `
        SELECT ck.*,t.* FROM territories t
        JOIN territorycheckouts_current ck ON ck.territory_id = t.id
        WHERE t.congregationid=${congId}
        AND ck.username='${username}'
        AND ck.in IS NULL
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

  async getTerritoriesByGroup (groupId, limit, offset = 0, withStatus) {
    const statusSelect = withStatus ? 'ck.*,' : '';
    const statusJoin = withStatus ? 'JOIN territorycheckouts_current ck ON ck.territory_id = t.id' : '';

    return await pool.query(`SELECT ${statusSelect}
      t.* FROM territories t
      ${statusJoin}
      WHERE t.group_id=${groupId}
      ORDER BY t.description, t.name
      ${limit ? `LIMIT ${offset},${limit}` : ''}
    `);
  }

  async territoryCheckoutStatus (checkout_id) {
    const sql = `SELECT * FROM territorycheckouts_current p WHERE p.checkout_id = ${checkout_id}`;
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
    const checkout = {
      territoryid: escape(territoryId),
      publisherid: escape(publisherId),
      status,
      create_user: escape(user),
      parent_checkout_id: escape(checkoutId),
    };
    const results = await pool.query('INSERT INTO territorycheckouts SET ?', checkout);
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

  async checkinAll(congId, username, tz_offset, timezone) {
    if (!congId) throw new Error('congregation id is required');
    if (!username) throw new Error('username is required');
    if (!tz_offset) throw new Error('tz_offset is required');
    if (!timezone) throw new Error('timezone is required');

    // get user
    const resultUser = await pool.query(`SELECT * FROM publishers WHERE username='${username}'`);
    const user = resultUser[0];

    // get all checked out territories
    const sqlCheckOuts = `SELECT tc.* FROM territorycheckouts_current tc
      WHERE tc.congregationid = ${congId} AND tc.in IS NULL`;
    const checkouts = await pool.query(sqlCheckOuts);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const promises = [];
      for (const ck of checkouts) {
        // check in
        const sql = `INSERT INTO territorycheckouts (territoryid, publisherid, status, create_user, parent_checkout_id)
          VALUES (${ck.territory_id}, ${ck.publisher_id}, 'IN', '${username}', ${ck.checkout_id})`;

        promises.push(await conn.query(sql));

        // reset NH statuses
        promises.push(activityLog.resetTerritoryActivity(ck.checkout_id, user.id, tz_offset, timezone, conn));
      }

      await Promise.all(promises);
      await conn.commit();
      await conn.release();

    } catch (e) {
      await conn.rollback();
      await conn.release();
      throw new Error(e);
    }
  }

  async createCampaignCheckouts(congId, username) {
    if (!congId) throw new Error('congregation id is required');
    if (!username) throw new Error('username is required');

    // get all checked out territories
    const sqlCheckOuts = `SELECT tc.* FROM territorycheckouts_current tc
      WHERE tc.congregationid = ${congId} AND tc.in IS NULL`;
    const checkouts = await pool.query(sqlCheckOuts);

    for (const ck of checkouts) {
      // replicate all checked out territories with current campaign flag
      const sql = `INSERT INTO territorycheckouts (territoryid, publisherid, status, timestamp, create_user)
        VALUES(${ck.territory_id}, ${ck.publisher_id}, 'OUT', NOW(), '${username}')`;
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
