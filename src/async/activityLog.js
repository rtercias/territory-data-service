import { conn } from '../server';
import { toArray } from 'lodash';

class ActivityLogAsync {
  async create (activityLog) {
    const result = await conn.query(`INSERT INTO activitylog (
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
      result = toArray(await conn.query(`SELECT * FROM activitylog WHERE checkout_id=${checkout_id} AND address_id=${address_id}`));
    } else if (checkout_id) {
      result = toArray(await conn.query(`SELECT * FROM activitylog WHERE checkout_id=${checkout_id}`));
    } else if (address_id) {
      result = toArray(await conn.query(`SELECT * FROM activitylog WHERE address_id=${address_id}`));
    }
    return result;
  }

  async readOne (id) {
    const sql = `SELECT log.*, a.parent_id FROM activitylog log LEFT JOIN addresses a ON log.address_id = a.id WHERE log.id=${id}`;
    const result = await conn.query(sql);
    if (result && result.length) {
      return result[0];
    }
    return null;
  }

  async update (activityLog) {
    await conn.query(`UPDATE activitylog SET
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
    await conn.query(`DELETE FROM activitylog WHERE id=${id}`);
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

    await conn.query(sql);
    return true;
  }
}

export default new ActivityLogAsync();
