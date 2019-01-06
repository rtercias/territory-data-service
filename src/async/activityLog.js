import { conn } from '../../index';
import { toArray } from 'lodash';

class ActivityLogAsync {
  async create (activityLog) {
    // TODO: only allow up to 3 activity logs per checkout_id and address_id

    await conn.query(`INSERT INTO activitylog (
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
  }

  async read (checkout_id, address_id) {
    let result;
    if (address_id) {
      result = toArray(await conn.query(`SELECT * FROM activitylog WHERE checkout_id=${checkout_id} AND address_id=${address_id}`));
    } else {
      result = toArray(await conn.query(`SELECT * FROM activitylog WHERE checkout_id=${checkout_id}`));
    }
    return result;
  }

  async readOne (id) {
    return await conn.query(`SELECT * FROM activitylog WHERE id=${id}`);
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
}

export default new ActivityLogAsync();
