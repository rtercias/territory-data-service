import { escape } from 'mysql';
import get from 'lodash/get';
import { pool } from '../server';

class PublisherAsync {
  async getUser (username) {
    return (await pool.query(`SELECT * FROM users WHERE username='${username}'`))[0];
  }

  async getPublisherByName (firstName, lastName, congId) {
    return (await pool.query(`SELECT * FROM users
      WHERE firstname='${firstName}' AND lastname='${lastName}' AND congregationid=${congId}`))[0];
  }

  async getPublisherById (publisherId, congId) {
    if (!publisherId) {
      return null;
    }

    const congIdFilter = congId ? ` AND congregationid=${congId}` : '';
    return (await pool.query(`SELECT * FROM users
      WHERE id=${publisherId}${congIdFilter}`))[0];
  }

  async searchPublishers (congId, keyword) {
    const kw = keyword || '';
    const sql = `SELECT * FROM users
      WHERE congregationid = ${congId} AND (firstname LIKE '%${kw}%' OR lastname LIKE '%${kw}%')`;
    return await pool.query(sql);
  }

  async create (publisher) {
    if (!publisher.congregationid) {
      throw new Error('congregation id is required');
    }
    if (!publisher.username) {
      throw new Error('username is required');
    }
    if (!publisher.create_user) {
      throw new Error('create user is required');
    }
    if (!publisher.role) {
      throw new Error('role is required');
    }

    const sql = `INSERT INTO publishers (
      congregationid,
      username,
      firstname,
      lastname,
      create_user,
      status
    ) VALUES (
      ${ publisher.congregationid },
      ${ escape(publisher.username) },
      ${ escape(get(publisher, 'firstname')) || '' },
      ${ escape(get(publisher, 'lastname')) || '' },
      ${ publisher.create_user },
      ${ escape(get(publisher, 'status')) || 'active' }
    )`;
    const result = await pool.query(sql);
    const role = await pool.query(`SELECT id FROM roles WHERE name = '${publisher.role}'`);
    if (role && role.length) {
      const roleSql = `INSERT INTO publisherroles (publisher_id, role_id)
        VALUES (${ result.insertId }, '${role[0].id}')`;
      await pool.query(roleSql);
    }

    return result.insertId;
  }

  async update (publisher) {
    if (!(publisher && publisher.id)) {
      throw new Error('id is required');
    }
    if (!publisher.congregationid) {
      throw new Error('congregation id is required');
    }
    if (!publisher.username) {
      throw new Error('username is required');
    }
    if (!publisher.update_user) {
      throw new Error('update user is required');
    }

    const sql = `UPDATE publishers SET
      congregationid = ${publisher.congregationid},
      username = ${escape(publisher.username)},
      firstname = ${escape(get(publisher, 'firstname')) || ''},
      lastname = ${escape(get(publisher, 'lastname')) || ''},
      update_user = ${publisher.update_user},
      status = ${escape(get(publisher, 'status')) || ''}
    WHERE id = ${publisher.id}`;
    await pool.query(sql);

    if (publisher.role) {
      const role = await pool.query(`SELECT id FROM roles WHERE name = '${publisher.role}'`);
      if (role && role.length) {
        const roleSql = `UPDATE publisherroles SET role_id = ${role[0].id}
          WHERE publisher_id = ${publisher.id}`;
        await pool.query(roleSql);
      }
    }
  }

  async delete (id) {
    if (!id) throw new Error('id is required');
    const sql = `DELETE FROM publishers WHERE id = ${id}`;
    return await pool.query(sql);
  }
}

export default new PublisherAsync();
