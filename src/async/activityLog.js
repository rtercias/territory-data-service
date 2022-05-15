import { pool } from '../server';
class ActivityLogAsync {
  async create (activityLog) {
    const result = await pool.query(`INSERT INTO activitylog (
      checkout_id,
      address_id,
      value,
      tz_offset,
      timezone,
      publisher_id,
      notes
    ) VALUES (
      ${ activityLog.checkout_id },
      ${ activityLog.address_id },
      '${ activityLog.value }',
      ${ activityLog.tz_offset },
      '${ activityLog.timezone }',
      ${ activityLog.publisher_id },
      '${ activityLog.notes || "" }'
    )`);

    return result.insertId;
  }

  async read (checkout_id, address_id) {
    let result;
    if (checkout_id && address_id) {
      result = await pool.query(`SELECT * FROM activitylog WHERE checkout_id=${checkout_id} AND address_id=${address_id}`);
    } else if (checkout_id) {
      result = await pool.query(`SELECT * FROM activitylog WHERE checkout_id=${checkout_id}`);
    } else if (address_id) {
      result = await pool.query(`SELECT * FROM activitylog WHERE address_id=${address_id}`);
    }
    return result;
  }

  async readOne (id) {
    const sql = `SELECT log.*, a.parent_id, a.territory_id FROM activitylog log LEFT JOIN addresses a ON log.address_id = a.id WHERE log.id=${id}`;
    const result = await pool.query(sql);
    if (result && result.length) {
      return result[0];
    }
    return null;
  }

  async lastActivity (id, checkoutId) {
    const checkoutSQL = checkoutId ? ` checkout_id=${checkoutId}` : '';
    const and = checkoutId && id ? ` AND ` : '';
    const addressSQL = id ? ` address_id=${id}` : '';
    const sql = `SELECT * FROM address_last_activity WHERE${checkoutSQL}${and}${addressSQL}`;
    const result = await pool.query(sql);
    if (id) {
      return result.length ? result[0] : null;
    }

    return result;
  }

  async update (activityLog) {
    await pool.query(`UPDATE activitylog SET
      checkout_id = ${ activityLog.checkout_id },
      address_id = ${ activityLog.address_id },
      value = '${ activityLog.value }',
      tz_offset = ${ activityLog.tz_offset },
      timezone = '${ activityLog.timezone }',
      publisher_id = ${ activityLog.publisher_id },
      notes = '${ activityLog.notes || "" }'
    WHERE id=${activityLog.id}`);
  }

  async delete (id) {
    await pool.query(`DELETE FROM activitylog WHERE id=${id}`);
  }

  async resetTerritoryActivity (checkout_id, userid, tz_offset, timezone) {
    const sql = `INSERT INTO activitylog (
        checkout_id,
        address_id,
        value,
        tz_offset,
        timezone,
        publisher_id
      )
      SELECT 
        a.checkout_id,
        a.address_id,
        'START',
        ${tz_offset},
        '${timezone}',
        ${userid}
      FROM address_last_activity a
      WHERE a.checkout_id = ${checkout_id} AND a.value != 'START'`;

    await pool.query(sql);
    return true;
  }
}

export default new ActivityLogAsync();
